(function () {
    'use strict';

    var KEY_NAME = 'strmcreator_apikey';
    var state = { libraries: [], crumbs: [], mode: 'movie', authStyle: 'query' };

    var $ = function (id) { return document.getElementById(id); };

    function f(obj, name) {
        if (!obj) return undefined;
        return obj[name] !== undefined ? obj[name] : obj[name.charAt(0).toUpperCase() + name.slice(1)];
    }

    function setStatus(msg, kind) {
        var el = $('status');
        el.textContent = msg;
        el.className = 'status' + (kind ? ' ' + kind : '');
    }

    function authHeaders() {
        var key = localStorage.getItem(KEY_NAME) || '';
        var h = {};
        if (state.authStyle === 'mediabrowser') {
            h['Authorization'] = 'MediaBrowser Token="' + key + '"';
        } else if (state.authStyle === 'embytoken') {
            h['X-Emby-Token'] = key;
        }
        return h;
    }

    function apiUrl(path) {
        var url = '/StrmCreator/' + path;
        if (state.authStyle === 'query') {
            url += (url.indexOf('?') > -1 ? '&' : '?') + 'api_key=' + encodeURIComponent(localStorage.getItem(KEY_NAME) || '');
        }
        return url;
    }

    function api(method, path, body) {
        var opts = {
            method: method,
            headers: authHeaders()
        };
        if (body !== undefined) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        return fetch(apiUrl(path), opts).then(function (res) {
            if (!res.ok) {
                return res.text().then(function (t) {
                    throw new Error('HTTP ' + res.status + (t ? ' — ' + t.slice(0, 180) : ''));
                });
            }
            return res.json();
        });
    }

    // Detecta automaticamente qual formato de autenticação o servidor aceita.
    function detectAuthStyle(key) {
        var styles = [
            { name: 'mediabrowser', headers: { 'Authorization': 'MediaBrowser Token="' + key + '"' } },
            { name: 'embytoken', headers: { 'X-Emby-Token': key } },
            { name: 'query', headers: {} }
        ];
        var chain = Promise.reject();
        var tried = [];
        styles.forEach(function (s) {
            chain = chain.catch(function () {
                tried.push(s.name);
                var url = '/StrmCreator/Libraries';
                if (s.name === 'query') {
                    url += '?api_key=' + encodeURIComponent(key);
                }
                return fetch(url, { headers: s.headers }).then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status + ' com ' + s.name);
                    return res.json().then(function () { return s.name; });
                });
            });
        });
        return chain.catch(function (err) {
            throw new Error('nenhum formato funcionou (testei: ' + tried.join(', ') + ') — último erro: ' + err.message);
        });
    }

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    // ---------- setup da chave ----------

    function showSetup(msg) {
        $('setup').classList.remove('hidden');
        $('app').classList.add('hidden');
        if (msg) {
            var s = $('setupStatus');
            s.textContent = msg;
            s.className = 'status err';
        }
    }

    function tryConnect(stored) {
        var key = localStorage.getItem(KEY_NAME) || '';

        // Diagnóstico: versão do plugin no servidor (sem auth)
        fetch('/StrmCreator/Ping').then(function (r) { return r.json(); }).then(function (p) {
            var el = $('pluginVersion');
            if (el) el.textContent = 'plugin v' + f(p, 'version') + ' no servidor ✔';
        }).catch(function () { /* sem problema */ });

        detectAuthStyle(key).then(function (style) {
            state.authStyle = style;
            return api('GET', 'Libraries').then(function (libs) {
                state.libraries = libs || [];
                $('setup').classList.add('hidden');
                $('app').classList.remove('hidden');
                fillLibraries();
            });
        }).catch(function (err) {
            localStorage.removeItem(KEY_NAME);
            showSetup('A conexão falhou: ' + err.message + '. Verifique se o plugin está atualizado (Painel → Plugins) e se a chave está certa.');
        });
    }

    // ---------- bibliotecas ----------

    function fillLibraries() {
        var sel = $('library');
        sel.innerHTML = '';
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = state.libraries.length ? '— Escolha uma biblioteca —' : '— Nenhuma biblioteca com caminho encontrada —';
        sel.appendChild(opt);
        state.libraries.forEach(function (lib, i) {
            var o = document.createElement('option');
            o.value = String(i);
            o.textContent = f(lib, 'name') + '  (' + f(lib, 'path') + ')';
            sel.appendChild(o);
        });
        setStatus('Pronto.');
    }

    // ---------- navegador ----------

    function currentPath() {
        return state.crumbs.length ? state.crumbs[state.crumbs.length - 1].path : '';
    }

    function renderCrumb() {
        var c = $('crumb');
        c.innerHTML = '';
        if (!state.crumbs.length) {
            var s = document.createElement('span');
            s.className = 'muted';
            s.style.padding = '0';
            s.textContent = 'nenhuma pasta selecionada';
            c.appendChild(s);
            return;
        }
        state.crumbs.forEach(function (cr, i) {
            if (i > 0) {
                var sep = document.createElement('span');
                sep.className = 'sep';
                sep.textContent = '/';
                c.appendChild(sep);
            }
            var b = document.createElement('button');
            b.textContent = (i === 0 ? '🏠 ' : '') + cr.name;
            b.className = i === state.crumbs.length - 1 ? 'cur' : 'old';
            b.addEventListener('click', function () {
                state.crumbs = state.crumbs.slice(0, i + 1);
                loadFolders();
            });
            c.appendChild(b);
        });
    }

    function renderFolders(folders) {
        var list = $('folders');
        list.innerHTML = '';
        renderCrumb();
        if (!folders || !folders.length) {
            var none = document.createElement('div');
            none.className = 'muted';
            none.textContent = 'Sem subpastas — o arquivo será criado direto aqui.';
            list.appendChild(none);
            return;
        }
        folders.forEach(function (fo) {
            var row = document.createElement('button');
            row.className = 'folder';
            var name = document.createElement('span');
            name.textContent = '📁 ' + f(fo, 'name');
            row.appendChild(name);
            row.addEventListener('click', function () {
                state.crumbs.push({ name: f(fo, 'name'), path: f(fo, 'path') });
                loadFolders();
            });
            list.appendChild(row);
        });
    }

    function loadFolders() {
        var path = currentPath();
        if (!path) {
            renderFolders([]);
            return;
        }
        setStatus('Carregando pastas...', 'busy');
        api('GET', 'Folders?path=' + encodeURIComponent(path)).then(function (folders) {
            renderFolders(folders || []);
            setStatus('Pronto.');
        }).catch(function (err) {
            renderFolders([]);
            setStatus('Erro ao listar pastas: ' + err.message, 'err');
        });
    }

    // ---------- modo / prévia ----------

    function setMode(mode) {
        state.mode = mode;
        var isSeries = mode === 'series';
        $('modeMovie').className = isSeries ? '' : 'on';
        $('modeSeries').className = isSeries ? 'on' : '';
        $('seriesRow').classList.toggle('hidden', !isSeries);
        $('linksLabel').textContent = isSeries ? 'Links de stream (um por linha = um episódio)' : 'Link de stream';
        updatePreview();
    }

    function linksList() {
        return $('links').value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    }

    function updatePreview() {
        var p = $('preview');
        if (state.mode !== 'series') { p.style.display = 'none'; return; }
        var series = $('name').value.trim() || 'Serie';
        var season = parseInt($('season').value, 10) || 1;
        var first = parseInt($('firstEp').value, 10) || 1;
        var lines = linksList();
        p.textContent = lines.length
            ? lines.map(function (_, i) { return series.replace(/ /g, '-') + ' S' + pad(season) + 'E' + pad(first + i) + '.strm'; }).join('\n')
            : 'Cole os links (um por linha) para ver a prévia dos arquivos.';
        p.style.display = 'block';
    }

    // ---------- criar ----------

    function create() {
        if (!currentPath()) { setStatus('Escolha a biblioteca e a pasta de destino.', 'err'); return; }
        var name = $('name').value.trim();
        var lines = linksList();
        $('scanBtn').classList.add('hidden');

        if (state.mode === 'series') {
            var season = parseInt($('season').value, 10) || 1;
            var first = parseInt($('firstEp').value, 10) || 1;
            if (!name || !lines.length) { setStatus('Preencha o nome da série e ao menos um link.', 'err'); return; }
            setStatus('Criando ' + lines.length + ' episódio(s)...', 'busy');
            api('POST', 'Episodes', {
                FolderPath: currentPath(),
                SeriesName: name,
                Season: season,
                Episodes: lines.map(function (line, i) { return { Episode: first + i, StreamUrl: line }; })
            }).then(function (r) {
                setStatus('✔ ' + f(r, 'message') + ' Agora escaneie as bibliotecas.', f(r, 'failed') ? 'err' : 'ok');
                if (f(r, 'created') > 0) $('scanBtn').classList.remove('hidden');
            }).catch(function (err) { setStatus('Erro: ' + err.message, 'err'); });
            return;
        }

        var url = lines[0] || '';
        if (!name || !url) { setStatus('Preencha o nome do arquivo e o link de stream.', 'err'); return; }
        setStatus('Criando...', 'busy');
        api('POST', 'Strm', { FolderPath: currentPath(), FileName: name, StreamUrl: url })
            .then(function (r) {
                setStatus('✔ ' + f(r, 'message') + ' Agora escaneie as bibliotecas.', 'ok');
                $('scanBtn').classList.remove('hidden');
            })
            .catch(function (err) { setStatus('Erro: ' + err.message, 'err'); });
    }

    function scan() {
        setStatus('Escaneando bibliotecas...', 'busy');
        fetch('/Library/Refresh', { method: 'POST', headers: authHeaders() })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                setStatus('✔ Scan disparado! O item deve aparecer em instantes.', 'ok');
            })
            .catch(function (err) { setStatus('Erro ao disparar o scan: ' + err.message, 'err'); });
    }

    // ---------- bind ----------

    $('keySave').addEventListener('click', function () {
        var key = $('keyInput').value.trim();
        if (!key) return;
        localStorage.setItem(KEY_NAME, key);
        tryConnect(true);
    });
    $('keyInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('keySave').click(); });
    $('rekey').addEventListener('click', function (e) {
        e.preventDefault();
        showSetup();
    });

    $('library').addEventListener('change', function () {
        var lib = state.libraries[parseInt(this.value, 10)];
        if (!lib) { state.crumbs = []; renderFolders([]); return; }
        state.crumbs = [{ name: f(lib, 'name'), path: f(lib, 'path') }];
        loadFolders();
    });

    $('newFolderBtn').addEventListener('click', function () {
        var input = $('newFolder');
        var name = input.value.trim();
        if (!name) return;
        if (!currentPath()) { setStatus('Escolha uma biblioteca primeiro.', 'err'); return; }
        api('POST', 'Folders/Create', { ParentPath: currentPath(), Name: name })
            .then(function () { input.value = ''; setStatus('Pasta criada ✔', 'ok'); loadFolders(); })
            .catch(function (err) { setStatus('Erro ao criar pasta: ' + err.message, 'err'); });
    });

    $('modeMovie').addEventListener('click', function () { setMode('movie'); });
    $('modeSeries').addEventListener('click', function () { setMode('series'); });
    ['name', 'season', 'firstEp', 'links'].forEach(function (id) {
        $(id).addEventListener('input', updatePreview);
    });
    $('createBtn').addEventListener('click', create);
    $('scanBtn').addEventListener('click', scan);

    // ---------- start ----------

    if (localStorage.getItem(KEY_NAME)) {
        tryConnect(true);
    } else {
        showSetup();
    }
})();
