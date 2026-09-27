(function () {
    'use strict';

    var CFG = window.__StrmCreator || {};
    var state = {
        isAdmin: !CFG.adminOnly, // se não exigir admin, já considera ok
        libraries: [],
        currentLibrary: null,
        currentPath: '',
        currentFolderName: ''
    };

    // ---------- Helpers de API ----------

    function getServerAddress() {
        try {
            if (window.ApiClient && typeof window.ApiClient.serverAddress === 'function') {
                return String(window.ApiClient.serverAddress()).replace(/\/+$/, '');
            }
        } catch (e) { /* ignora */ }
        return window.location.origin;
    }

    function getApiKey() {
        try {
            var creds = JSON.parse(localStorage.getItem('jellyfin_credentials') || 'null');
            if (creds && creds.Servers && creds.Servers.length) {
                var addr = getServerAddress();
                var server = creds.Servers.filter(function (s) {
                    return s.ManualAddress && addr && s.ManualAddress.indexOf(addr) === 0;
                })[0] || creds.Servers[0];
                return server.AccessToken || '';
            }
        } catch (e) { /* ignora */ }
        return '';
    }

    function apiUrl(path, extraParams) {
        var url = getServerAddress() + '/StrmCreator/' + path;
        url += (url.indexOf('?') > -1 ? '&' : '?') + 'api_key=' + encodeURIComponent(getApiKey());
        if (extraParams) {
            Object.keys(extraParams).forEach(function (k) {
                url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(extraParams[k]);
            });
        }
        return url;
    }

    function api(path, opts) {
        opts = opts || {};
        var init = {
            method: opts.method || 'GET',
            headers: {}
        };
        if (opts.body) {
            init.headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(opts.body);
        }
        return fetch(apiUrl(path), init).then(function (res) {
            if (!res.ok) {
                return res.text().then(function (text) {
                    throw new Error(text || ('Erro HTTP ' + res.status));
                });
            }
            return res.json();
        });
    }

    // ---------- Botão na página de detalhes ----------

    function getItemName() {
        var el = document.querySelector('.itemName, .detail-page-primary-container .itemName, h1.itemName');
        if (el && el.textContent.trim()) {
            return el.textContent.trim();
        }
        // fallback: título da página
        return (document.title || '').replace(' - Jellyfin', '').trim();
    }

    function isDetailsPage() {
        return location.hash.indexOf('/details') > -1;
    }

    function checkAdmin() {
        if (!CFG.adminOnly) {
            state.isAdmin = true;
            return Promise.resolve(true);
        }
        return fetch(getServerAddress() + '/Users/Me?api_key=' + encodeURIComponent(getApiKey()))
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (user) {
                state.isAdmin = !!(user && user.Policy && user.Policy.IsAdministrator);
                return state.isAdmin;
            })
            .catch(function () { return false; });
    }

    function addStrmButton() {
        if (!isDetailsPage() || !state.isAdmin) return;
        var container = document.querySelector('.mainDetailButtons');
        if (!container || document.getElementById('strmCreatorBtn')) return;

        var btn = document.createElement('button');
        btn.id = 'strmCreatorBtn';
        btn.setAttribute('is', 'paper-icon-button-light');
        btn.className = 'btnStrmCreator autoSize';
        btn.title = 'Adicionar .strm';
        btn.innerHTML = '<iron-icon icon="add"></iron-icon>';
        btn.addEventListener('click', openDialog);
        container.appendChild(btn);
    }

    // Observa mudanças no DOM para re-adicionar o botão a cada navegação
    var observer = new MutationObserver(function () {
        addStrmButton();
    });

    function start() {
        checkAdmin().then(addStrmButton);
        // re-checa admin quando troca de página
        setInterval(function () {
            if (isDetailsPage() && !document.getElementById('strmCreatorBtn')) {
                checkAdmin().then(addStrmButton);
            }
        }, 1500);
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                observer.observe(document.body, { childList: true, subtree: true });
            });
        }
    }

    // ---------- Dialog ----------

    function openDialog() {
        if (document.getElementById('strmCreatorDialog')) return;

        var dlg = document.createElement('dialog');
        dlg.id = 'strmCreatorDialog';
        dlg.style.cssText = 'border:none;border-radius:12px;padding:0;background:#1c1c1e;color:#fff;min-width:340px;max-width:480px;width:92vw;max-height:85vh;';

        var wrap = document.createElement('div');
        wrap.style.cssText = 'padding:24px;display:flex;flex-direction:column;gap:14px;max-height:85vh;overflow:auto;';

        var title = document.createElement('h2');
        title.textContent = 'Adicionar .strm';
        title.style.cssText = 'margin:0;font-size:1.3em;font-weight:600;';
        wrap.appendChild(title);

        // --- biblioteca ---
        var libLabel = document.createElement('label');
        libLabel.textContent = 'Biblioteca';
        libLabel.style.cssText = 'font-size:.85em;opacity:.7;';
        var libSelect = document.createElement('select');
        libSelect.style.cssText = dialogInputStyle();
        libSelect.addEventListener('change', function () {
            var lib = state.libraries[parseInt(libSelect.value, 10)];
            state.currentLibrary = lib;
            state.currentPath = lib.Path;
            state.currentFolderName = lib.Name;
            refreshFolderList();
        });
        libLabel.appendChild(document.createElement('br'));
        libLabel.appendChild(libSelect);
        wrap.appendChild(libLabel);

        // --- navegador de pastas ---
        var browserBox = document.createElement('div');
        browserBox.id = 'strmCreatorBrowser';
        browserBox.style.cssText = 'border:1px solid #333;border-radius:8px;padding:10px;min-height:80px;max-height:180px;overflow:auto;';
        wrap.appendChild(browserBox);

        // --- nova pasta ---
        var newFolderRow = document.createElement('div');
        newFolderRow.style.cssText = 'display:flex;gap:8px;';
        var newFolderInput = document.createElement('input');
        newFolderInput.type = 'text';
        newFolderInput.placeholder = 'Nome da nova pasta (opcional)';
        newFolderInput.style.cssText = dialogInputStyle() + 'flex:1;';
        var newFolderBtn = document.createElement('button');
        newFolderBtn.textContent = 'Criar pasta';
        newFolderBtn.style.cssText = dialogButtonStyle();
        newFolderBtn.addEventListener('click', function () {
            var name = newFolderInput.value.trim();
            if (!name) return;
            if (!state.currentPath) {
                setStatus('Escolha uma biblioteca primeiro.', true);
                return;
            }
            api('Folders/Create', { method: 'POST', body: { parentPath: state.currentPath, name: name } })
                .then(function () {
                    newFolderInput.value = '';
                    refreshFolderList();
                })
                .catch(function (err) { setStatus(err.message, true); });
        });
        newFolderRow.appendChild(newFolderInput);
        newFolderRow.appendChild(newFolderBtn);
        wrap.appendChild(newFolderRow);

        // --- nome do arquivo ---
        var nameLabel = document.createElement('label');
        nameLabel.textContent = 'Nome do arquivo';
        nameLabel.style.cssText = 'font-size:.85em;opacity:.7;';
        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = getItemName() || '';
        nameInput.placeholder = 'Ex.: Meu-Filme (espacos viram "-")';
        nameInput.style.cssText = dialogInputStyle();
        nameLabel.appendChild(document.createElement('br'));
        nameLabel.appendChild(nameInput);
        wrap.appendChild(nameLabel);

        // --- link de stream ---
        var urlLabel = document.createElement('label');
        urlLabel.textContent = 'Link de stream';
        urlLabel.style.cssText = 'font-size:.85em;opacity:.7;';
        var urlInput = document.createElement('textarea');
        urlInput.rows = 3;
        urlInput.placeholder = 'https://... ou outro link de stream';
        urlInput.style.cssText = dialogInputStyle() + 'resize:vertical;';
        urlLabel.appendChild(document.createElement('br'));
        urlLabel.appendChild(urlInput);
        wrap.appendChild(urlLabel);

        // --- status ---
        var status = document.createElement('div');
        status.id = 'strmCreatorStatus';
        status.style.cssText = 'min-height:1.2em;font-size:.85em;';
        wrap.appendChild(status);

        // --- botões de ação ---
        var actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
        var cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.style.cssText = dialogButtonStyle();
        cancelBtn.addEventListener('click', function () { dlg.close(); });
        var createBtn = document.createElement('button');
        createBtn.textContent = 'Criar';
        createBtn.style.cssText = dialogButtonStyle(true);
        createBtn.addEventListener('click', function () {
            if (!state.currentPath) {
                setStatus('Escolha a biblioteca e a pasta.', true);
                return;
            }
            var fileName = nameInput.value.trim();
            var streamUrl = urlInput.value.trim();
            if (!fileName || !streamUrl) {
                setStatus('Preencha o nome do arquivo e o link de stream.', true);
                return;
            }
            setStatus('Criando...', false);
            api('Strm', { method: 'POST', body: { folderPath: state.currentPath, fileName: fileName, streamUrl: streamUrl } })
                .then(function (result) {
                    setStatus('✔ ' + result.message, false);
                    setTimeout(function () { dlg.close(); }, 1500);
                })
                .catch(function (err) { setStatus(err.message, true); });
        });
        actions.appendChild(cancelBtn);
        actions.appendChild(createBtn);
        wrap.appendChild(actions);

        dlg.appendChild(wrap);
        document.body.appendChild(dlg);
        dlg.showModal();

        dlg.addEventListener('close', function () { dlg.remove(); });

        setStatus('', false);
        loadLibraries(libSelect);
    }

    function dialogInputStyle() {
        return 'background:#2a2a2e;border:1px solid #444;border-radius:8px;color:#fff;padding:8px 10px;font-size:14px;width:100%;box-sizing:border-box;';
    }

    function dialogButtonStyle(primary) {
        return primary
            ? 'background:#00a4dc;border:none;border-radius:8px;color:#fff;padding:10px 18px;font-size:14px;cursor:pointer;'
            : 'background:#2a2a2e;border:1px solid #444;border-radius:8px;color:#fff;padding:10px 18px;font-size:14px;cursor:pointer;';
    }

    function setStatus(msg, isError) {
        var el = document.getElementById('strmCreatorStatus');
        if (!el) return;
        el.textContent = msg;
        el.style.color = isError ? '#ff6c6c' : '#7ddb7d';
    }

    // ---------- Dados ----------

    function loadLibraries(libSelect) {
        setStatus('Carregando bibliotecas...', false);
        api('Libraries').then(function (libs) {
            state.libraries = libs;
            libSelect.innerHTML = '';
            var opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '— Escolha uma biblioteca —';
            libSelect.appendChild(opt);
            libs.forEach(function (lib, i) {
                var o = document.createElement('option');
                o.value = String(i);
                o.textContent = lib.name;
                libSelect.appendChild(o);
            });
            setStatus('', false);
        }).catch(function (err) {
            setStatus('Erro ao carregar bibliotecas: ' + err.message, true);
        });
    }

    function refreshFolderList() {
        var box = document.getElementById('strmCreatorBrowser');
        if (!box) return;
        box.innerHTML = '';

        var crumb = document.createElement('div');
        crumb.textContent = state.currentFolderName || '';
        crumb.style.cssText = 'font-size:.8em;opacity:.6;margin-bottom:8px;word-break:break-all;';
        box.appendChild(crumb);

        if (!state.currentPath) {
            var hint = document.createElement('div');
            hint.textContent = 'Escolha uma biblioteca para navegar pelas pastas.';
            hint.style.cssText = 'opacity:.5;font-size:.85em;';
            box.appendChild(hint);
            return;
        }

        api('Folders', { path: state.currentPath }).then(function (folders) {
            if (!folders.length) {
                var none = document.createElement('div');
                none.textContent = 'Sem subpastas. O arquivo será criado aqui.';
                none.style.cssText = 'opacity:.5;font-size:.85em;';
                box.appendChild(none);
                return;
            }
            folders.forEach(function (f) {
                var row = document.createElement('button');
                row.textContent = '📁 ' + f.name;
                row.style.cssText = 'display:block;width:100%;text-align:left;background:none;border:none;border-radius:6px;color:#fff;padding:8px 6px;cursor:pointer;font-size:14px;';
                row.addEventListener('mouseenter', function () { row.style.background = '#2a2a2e'; });
                row.addEventListener('mouseleave', function () { row.style.background = 'none'; });
                row.addEventListener('click', function () {
                    state.currentPath = f.path;
                    state.currentFolderName += ' / ' + f.name;
                    refreshFolderList();
                });
                box.appendChild(row);
            });
        }).catch(function (err) {
            var errEl = document.createElement('div');
            errEl.textContent = 'Erro: ' + err.message;
            errEl.style.cssText = 'color:#ff6c6c;font-size:.85em;';
            box.appendChild(errEl);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
