/* ==========================================================================
   REVISTA GONZALINA · código común del sitio
   --------------------------------------------------------------------------
   Aquí está TODO lo que hace funcionar el menú, los muros de artículos,
   el muro de fotos, los cuestionarios y el panel para publicar.

   Para agregar una sección nueva al menú, solo edita la lista "secciones"
   de la CONFIGURACIÓN (más abajo). Los textos de cada sección también se
   cambian ahí.
   ========================================================================== */
(function () {
    "use strict";

    /* ===================================================================
       CONFIGURACIÓN  (esto sí puedes editarlo)
       =================================================================== */
    var CONFIG = {
        // Tu repositorio de GitHub (sirve para los botones de "Publicar" y "Subir fotos")
        repo: "RevistaGonzalina/RevistaGonzalina",
        rama: "main",

        // Cuántos artículos se muestran cada vez y cuántas fotos se cargan por tanda
        articulosPorPagina: 6,
        fotosPorTanda: 18,

        // Secciones del menú. "tipo" puede ser: "inicio", "articulos", "fotos", "cuestionarios" o "pagina" (página suelta).
        // Para las de tipo "articulos", "id" es también el nombre de la carpeta
        // dentro de /articulos/ donde viven sus artículos.
        secciones: [
            { id: "inicio", titulo: "Inicio", url: "index.html", tipo: "inicio" },
            {
                id: "apoyo", titulo: "Conciencia y apoyo", url: "apoyo.html", tipo: "articulos",
                descripcion: "Artículos sobre las problemáticas que vivimos como estudiantes y sobre cómo podemos apoyarnos entre compañeros."
            },
            {
                id: "logros", titulo: "Logros", url: "logros.html", tipo: "articulos",
                descripcion: "Reconocimientos, premios y metas alcanzadas por estudiantes, cursos y por todo nuestro plantel."
            },
            {
                id: "cultura", titulo: "Cultura estudiantil", url: "cultura.html", tipo: "articulos",
                descripcion: "Arte, deportes, tradiciones y la vida diaria dentro y fuera de las aulas."
            },
            {
                id: "galeria", titulo: "Galería", url: "galeria.html", tipo: "fotos",
                descripcion: "Un muro de fotos que nunca termina: sigue bajando y descubre más momentos de nuestra comunidad."
            },
            {
                id: "cuestionarios", titulo: "Cuestionarios", url: "cuestionarios.html", tipo: "cuestionarios",
                descripcion: "Pon a prueba lo que sabes. Resuelve cada cuestionario aquí mismo: tus respuestas no se guardan en ningún lado, el resultado es solo para ti."
            },
            { id: "creditos", titulo: "Créditos", url: "creditos.html", tipo: "pagina" }
        ]
    };

    /* ===================================================================
       DE AQUÍ PARA ABAJO NO HACE FALTA EDITAR
       =================================================================== */
    var DATOS = window.REVISTA_DATOS || { articulos: [], fotos: [] };
    DATOS.articulos = DATOS.articulos || [];
    DATOS.fotos = DATOS.fotos || [];
    DATOS.cuestionarios = DATOS.cuestionarios || [];

    var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
        "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

    /* ---------- utilidades ---------- */
    function $(sel, raiz) { return (raiz || document).querySelector(sel); }

    function esc(t) {
        return String(t == null ? "" : t)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function normalizar(t) {
        return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    }

    function formatoFecha(iso) {
        var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
        if (!m) return "";
        return parseInt(m[3], 10) + " de " + MESES[parseInt(m[2], 10) - 1] + " de " + m[1];
    }

    function buscarSeccion(id) {
        for (var i = 0; i < CONFIG.secciones.length; i++) {
            if (CONFIG.secciones[i].id === id) return CONFIG.secciones[i];
        }
        return null;
    }

    // Codifica una ruta de archivo (con espacios, tildes...) sin romper las barras
    function rutaArchivo(ruta) {
        return String(ruta).split("/").map(function (parte) {
            try { return encodeURIComponent(decodeURIComponent(parte)); }
            catch (e) { return encodeURIComponent(parte); }
        }).join("/");
    }

    function esExterna(u) { return /^[a-z][a-z0-9+.-]*:/i.test(u) || u.indexOf("//") === 0; }

    function urlImagen(ruta) {
        if (!ruta) return "";
        if (!esExterna(ruta)) return rutaArchivo(ruta);
        // Si pegaste el enlace de una imagen tal como lo muestra GitHub
        // (https://github.com/usuario/repo/blob/...), lo convertimos al enlace real de la imagen.
        var m = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^?#]+)/i.exec(ruta);
        return m ? "https://raw.githubusercontent.com/" + m[1] + "/" + m[2] + "/" + m[3] : ruta;
    }

    // Solo permite enlaces http, https, mailto y rutas internas
    function urlSegura(u) {
        u = String(u || "").trim();
        if (!u) return "";
        if (/^[a-z][a-z0-9+.-]*:/i.test(u) && !/^(https?:|mailto:)/i.test(u)) return "";
        return u;
    }

    function enlaceArticulo(a) { return "articulo.html?a=" + encodeURIComponent(a.id); }

    function ordenarPorFecha(lista) {
        return lista.slice().sort(function (x, y) {
            if (x.fecha !== y.fecha) return x.fecha < y.fecha ? 1 : -1;
            return x.id < y.id ? 1 : -1;
        });
    }

    /* ---------- Markdown sencillo (negrita, títulos, listas, citas, imágenes, enlaces) ---------- */
    function enLinea(texto) {
        var guardados = [];
        function guardar(html) { guardados.push(html); return "\u0000" + (guardados.length - 1) + "\u0000"; }

        var s = texto;
        s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, url) {
            var u = urlSegura(url);
            if (!u) return m;
            return guardar('<img src="' + urlImagen(u) + '" alt="' + alt + '" class="image-deco" loading="lazy">');
        });
        s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, url) {
            var u = urlSegura(url);
            if (!u) return txt;
            var externo = /^https?:/i.test(u);
            var destino = externo ? u : (/^mailto:|^#/i.test(u) ? u : rutaArchivo(u));
            return guardar('<a href="' + destino + '"' + (externo ? ' target="_blank" rel="noopener"' : "") + ">" + txt + "</a>");
        });
        s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        s = s.replace(/(^|[\s(¿¡])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>");
        s = s.replace(/(^|[\s(¿¡])_([^_\s][^_]*?)_/g, "$1<em>$2</em>");
        return s.replace(/\u0000(\d+)\u0000/g, function (m, i) { return guardados[+i]; });
    }

    function parrafoHtml(lineas) {
        return lineas.map(function (l) { return enLinea(esc(l)); }).join("<br>");
    }

    function markdown(fuente) {
        var lineas = String(fuente || "").replace(/\r\n?/g, "\n").split("\n");
        var salida = [], i = 0, m;
        var esVacia = function (l) { return /^\s*$/.test(l); };
        var esBloque = function (l) {
            return /^#{1,3}\s+/.test(l) || /^>\s?/.test(l) || /^\s*[-*]\s+/.test(l) ||
                /^\s*\d+[.)]\s+/.test(l) || /^\s*([-*_])\1{2,}\s*$/.test(l);
        };

        while (i < lineas.length) {
            var l = lineas[i];
            if (esVacia(l)) { i++; continue; }

            if ((m = /^(#{1,3})\s+(.*)$/.exec(l))) {
                var n = m[1].length + 1;
                salida.push("<h" + n + ">" + enLinea(esc(m[2].trim())) + "</h" + n + ">");
                i++; continue;
            }
            if (/^\s*([-*_])\1{2,}\s*$/.test(l)) { salida.push("<hr>"); i++; continue; }

            if (/^>\s?/.test(l)) {
                var cita = [];
                while (i < lineas.length && /^>\s?/.test(lineas[i])) { cita.push(lineas[i].replace(/^>\s?/, "")); i++; }
                salida.push("<blockquote>" + parrafoHtml(cita) + "</blockquote>");
                continue;
            }
            if (/^\s*[-*]\s+/.test(l)) {
                var items = [];
                while (i < lineas.length && /^\s*[-*]\s+/.test(lineas[i])) { items.push(lineas[i].replace(/^\s*[-*]\s+/, "")); i++; }
                salida.push("<ul>" + items.map(function (t) { return "<li>" + enLinea(esc(t)) + "</li>"; }).join("") + "</ul>");
                continue;
            }
            if (/^\s*\d+[.)]\s+/.test(l)) {
                var nums = [];
                while (i < lineas.length && /^\s*\d+[.)]\s+/.test(lineas[i])) { nums.push(lineas[i].replace(/^\s*\d+[.)]\s+/, "")); i++; }
                salida.push("<ol>" + nums.map(function (t) { return "<li>" + enLinea(esc(t)) + "</li>"; }).join("") + "</ol>");
                continue;
            }

            var parrafo = [];
            while (i < lineas.length && !esVacia(lineas[i]) && (parrafo.length === 0 || !esBloque(lineas[i]))) {
                parrafo.push(lineas[i]); i++;
            }
            salida.push("<p>" + parrafoHtml(parrafo) + "</p>");
        }
        return salida.join("\n");
    }

    /* ---------- menú lateral ---------- */
    function pintarMenu(actual) {
        var nav = document.getElementById("menu");
        if (!nav) return;
        nav.innerHTML = CONFIG.secciones.map(function (s) {
            var activo = s.id === actual;
            return '<a href="' + esc(s.url) + '"' + (activo ? ' class="activo" aria-current="page"' : "") + ">" + esc(s.titulo) + "</a>";
        }).join("");
    }

    /* ---------- selector de letra (igual que en la plantilla) ---------- */
    function iniciarFuente() {
        var selector = document.getElementById("fontFamily");
        if (!selector) return;
        var guardada = null;
        try { guardada = localStorage.getItem("fontFamily"); } catch (e) { /* sin almacenamiento */ }
        function aplicar(valor) {
            document.body.style.fontFamily = valor;
            var lado = document.getElementById("sidebar");
            if (lado) lado.style.fontFamily = valor;
        }
        if (guardada) { selector.value = guardada; aplicar(guardada); }
        selector.onchange = function () {
            try { localStorage.setItem("fontFamily", selector.value); } catch (e) { /* ignorar */ }
            aplicar(selector.value);
        };
    }

    /* ---------- tarjetas de artículos ---------- */
    function metaArticulo(a, conSeccion) {
        var partes = [];
        if (a.fecha) partes.push(esc(formatoFecha(a.fecha)));
        if (a.autor) partes.push("Por " + esc(a.autor));
        if (conSeccion) {
            var s = buscarSeccion(a.seccion);
            if (s) partes.push('<a href="' + esc(s.url) + '">' + esc(s.titulo) + "</a>");
        }
        return partes.join(" · ");
    }

    function tarjetaArticulo(a, conSeccion) {
        var sec = document.createElement("section");
        var foto = a.imagenMini || a.imagen;
        sec.className = "entrada" + (foto ? "" : " sin-imagen");
        sec.innerHTML =
            (foto ? '<a class="entrada-img" href="' + enlaceArticulo(a) + '" tabindex="-1" aria-hidden="true">' +
                '<img src="' + urlImagen(foto) + '" alt="" loading="lazy"></a>' : "") +
            '<div class="entrada-texto">' +
            '<h2 class="entrada-titulo"><a href="' + enlaceArticulo(a) + '">' + esc(a.titulo) + "</a></h2>" +
            '<p class="entrada-meta">' + metaArticulo(a, conSeccion) + "</p>" +
            (a.resumen ? "<p>" + esc(a.resumen) + "</p>" : "") +
            '<p><a class="leer-mas" href="' + enlaceArticulo(a) + '">Leer artículo →</a></p>' +
            "</div>";
        return sec;
    }

    /* ===================================================================
       PÁGINA: SECCIÓN DE ARTÍCULOS  (muro de blog)
       =================================================================== */
    function iniciarSeccion() {
        var id = document.body.getAttribute("data-seccion");
        var sec = buscarSeccion(id) || { id: id, titulo: id, descripcion: "" };
        pintarMenu(id);
        document.title = sec.titulo + " · Revista Gonzalina";

        $("#sec-titulo").textContent = sec.titulo;
        $("#sec-desc").textContent = sec.descripcion || "";

        var main = document.getElementById("content");
        var ancla = document.getElementById("muro-ancla");
        var boton = document.getElementById("mas");
        var buscador = document.getElementById("buscar");
        var estado = document.getElementById("muro-estado");

        var todos = ordenarPorFecha(DATOS.articulos.filter(function (a) { return a.seccion === id; }));
        var filtrados = todos, mostrados = 0;

        function limpiar() {
            var viejas = main.querySelectorAll("section.entrada, section.vacio");
            for (var i = 0; i < viejas.length; i++) viejas[i].parentNode.removeChild(viejas[i]);
        }

        function cargarMas() {
            var hasta = Math.min(mostrados + CONFIG.articulosPorPagina, filtrados.length);
            for (; mostrados < hasta; mostrados++) main.insertBefore(tarjetaArticulo(filtrados[mostrados], false), ancla);
            boton.hidden = mostrados >= filtrados.length;
            estado.textContent = filtrados.length
                ? "Mostrando " + mostrados + " de " + filtrados.length + (filtrados.length === 1 ? " artículo" : " artículos")
                : "";
        }

        function mostrarVacio(texto) {
            var v = document.createElement("section");
            v.className = "vacio";
            v.innerHTML = "<p>" + texto + "</p>";
            main.insertBefore(v, ancla);
        }

        function dibujar() {
            limpiar();
            mostrados = 0;
            if (!filtrados.length) {
                boton.hidden = true;
                estado.textContent = "";
                mostrarVacio(todos.length
                    ? "No encontramos artículos con esa búsqueda."
                    : "Todavía no hay artículos en esta sección. ¡Muy pronto habrá novedades!");
                return;
            }
            cargarMas();
        }

        boton.addEventListener("click", cargarMas);
        buscador.addEventListener("input", function () {
            var q = normalizar(buscador.value).trim();
            filtrados = !q ? todos : todos.filter(function (a) {
                return normalizar([a.titulo, a.autor, a.resumen, a.texto].join(" ")).indexOf(q) !== -1;
            });
            dibujar();
        });
        if (!todos.length) buscador.parentNode.hidden = true;
        dibujar();
    }

    /* ===================================================================
       PÁGINA: UN ARTÍCULO
       =================================================================== */
    function iniciarArticulo() {
        var idPedido = new URLSearchParams(location.search).get("a") || "";
        var art = null;
        for (var i = 0; i < DATOS.articulos.length; i++) {
            if (DATOS.articulos[i].id === idPedido) { art = DATOS.articulos[i]; break; }
        }
        var cont = document.getElementById("articulo");

        if (!art) {
            pintarMenu("");
            document.title = "Artículo no encontrado · Revista Gonzalina";
            cont.innerHTML = '<h1>No encontramos este artículo</h1>' +
                '<p>Puede que el enlace esté incompleto o que el artículo ya no esté publicado.</p>' +
                '<p><a href="index.html">← Volver al inicio</a></p>';
            return;
        }

        var sec = buscarSeccion(art.seccion);
        pintarMenu(art.seccion);
        document.title = art.titulo + " · Revista Gonzalina";
        var desc = document.querySelector('meta[name="description"]');
        if (desc && art.resumen) desc.setAttribute("content", art.resumen);

        cont.innerHTML =
            '<p class="volver"><a href="' + esc(sec ? sec.url : "index.html") + '">← ' +
            esc(sec ? sec.titulo : "Volver al inicio") + "</a></p>" +
            "<h1>" + esc(art.titulo) + "</h1>" +
            '<p class="entrada-meta centrado">' + metaArticulo(art, false) + "</p>" +
            (art.imagen ? '<img class="portada image-deco" src="' + urlImagen(art.imagen) + '" alt="">' : "") +
            '<div class="articulo-cuerpo">' + markdown(art.texto) + "</div>";

        var relacionados = ordenarPorFecha(DATOS.articulos.filter(function (a) {
            return a.seccion === art.seccion && a.id !== art.id;
        })).slice(0, 3);
        var otro = document.getElementById("relacionados");
        if (relacionados.length && otro) {
            otro.hidden = false;
            var lista = $(".relacionados-lista", otro);
            relacionados.forEach(function (a) {
                var li = document.createElement("li");
                li.innerHTML = '<a href="' + enlaceArticulo(a) + '">' + esc(a.titulo) + "</a> <small>" + esc(formatoFecha(a.fecha)) + "</small>";
                lista.appendChild(li);
            });
        }
    }

    /* ===================================================================
       PÁGINA: GALERÍA  (muro de fotos con scroll infinito)
       =================================================================== */
    function iniciarGaleria() {
        pintarMenu("galeria");
        var sec = buscarSeccion("galeria") || {};
        document.title = (sec.titulo || "Galería") + " · Revista Gonzalina";
        $("#sec-titulo").textContent = sec.titulo || "Galería";
        $("#sec-desc").textContent = sec.descripcion || "";

        var fotos = DATOS.fotos;
        var muro = document.getElementById("fotos");
        var centinela = document.getElementById("centinela");
        var estado = document.getElementById("fotos-estado");
        var vacio = document.getElementById("fotos-vacio");

        if (!fotos.length) {
            muro.hidden = true; centinela.hidden = true; vacio.hidden = false;
            return;
        }

        var consulta = window.matchMedia("(max-width: 800px)");
        var columnas = [], alturas = [], mostradas = 0, observador = null;

        function numeroColumnas() { return consulta.matches ? 2 : 3; }

        function urlOriginal(f) { return "fotos/" + rutaArchivo(f.archivo); }
        function urlMini(f) { return f.mini ? rutaArchivo(f.mini) : urlOriginal(f); }

        function crearFigura(f, idx) {
            var fig = document.createElement("figure");
            fig.className = "foto";
            var ratio = f.w && f.h ? f.w + "/" + f.h : "1/1";
            fig.innerHTML =
                '<button type="button" class="foto-btn" data-i="' + idx + '" aria-label="Ampliar foto' + (f.pie ? ": " + esc(f.pie) : "") + '">' +
                '<img src="' + urlMini(f) + '" alt="' + esc(f.pie) + '" loading="lazy" decoding="async"' +
                (f.w && f.h ? ' width="' + f.w + '" height="' + f.h + '"' : "") +
                ' style="aspect-ratio:' + ratio + '"></button>' +
                (f.pie ? "<figcaption>" + esc(f.pie) + "</figcaption>" : "");
            return fig;
        }

        function colocar(idx) {
            var f = fotos[idx], menor = 0;
            for (var k = 1; k < alturas.length; k++) if (alturas[k] < alturas[menor]) menor = k;
            var ratio = f.w && f.h ? f.h / f.w : 1;
            alturas[menor] += ratio + 0.1 + (f.pie ? 0.12 : 0);
            columnas[menor].appendChild(crearFigura(f, idx));
        }

        function armar() {
            muro.innerHTML = "";
            columnas = []; alturas = [];
            for (var c = 0; c < numeroColumnas(); c++) {
                var col = document.createElement("div");
                col.className = "fotos-col";
                muro.appendChild(col);
                columnas.push(col); alturas.push(0);
            }
            for (var i = 0; i < mostradas; i++) colocar(i);
        }

        function actualizarEstado() {
            estado.textContent = mostradas >= fotos.length
                ? "Eso es todo por ahora (" + fotos.length + (fotos.length === 1 ? " foto" : " fotos") + "). Vuelve pronto: el muro sigue creciendo."
                : "Cargando más fotos…";
        }

        function cargarTanda() {
            if (mostradas >= fotos.length) return;
            var hasta = Math.min(mostradas + CONFIG.fotosPorTanda, fotos.length);
            for (; mostradas < hasta; mostradas++) colocar(mostradas);
            actualizarEstado();
            if (observador) { observador.unobserve(centinela); if (mostradas < fotos.length) observador.observe(centinela); }
        }

        consulta.addEventListener
            ? consulta.addEventListener("change", armar)
            : consulta.addListener(armar);

        armar();
        if ("IntersectionObserver" in window) {
            observador = new IntersectionObserver(function (entradas) {
                if (entradas[0].isIntersecting) cargarTanda();
            }, { rootMargin: "900px 0px" });
            observador.observe(centinela);
        } else {
            while (mostradas < fotos.length) cargarTanda();
        }
        cargarTanda();

        /* --- visor ampliado --- */
        var visor = document.getElementById("visor");
        var visorImg = $("#visor-img");
        var visorPie = $("#visor-pie");
        var actual = 0, previoFoco = null;

        function abrir(idx) {
            actual = (idx + fotos.length) % fotos.length;
            var f = fotos[actual];
            visorImg.src = urlOriginal(f);
            visorImg.alt = f.pie || "";
            visorPie.textContent = (f.pie ? f.pie + " · " : "") + formatoFecha(f.fecha);
            if (visor.hidden) {
                previoFoco = document.activeElement;
                visor.hidden = false;
                $("#visor-cerrar").focus();
            }
        }
        function cerrar() {
            visor.hidden = true;
            visorImg.removeAttribute("src");
            if (previoFoco && previoFoco.focus) previoFoco.focus();
        }

        muro.addEventListener("click", function (e) {
            var b = e.target.closest ? e.target.closest(".foto-btn") : null;
            if (b) abrir(parseInt(b.getAttribute("data-i"), 10));
        });
        $("#visor-cerrar").addEventListener("click", cerrar);
        $("#visor-ant").addEventListener("click", function () { abrir(actual - 1); });
        $("#visor-sig").addEventListener("click", function () { abrir(actual + 1); });
        visor.addEventListener("click", function (e) { if (e.target === visor) cerrar(); });
        document.addEventListener("keydown", function (e) {
            if (visor.hidden) return;
            if (e.key === "Escape") cerrar();
            else if (e.key === "ArrowLeft") abrir(actual - 1);
            else if (e.key === "ArrowRight") abrir(actual + 1);
        });
    }

    /* ===================================================================
       MOTOR DE CUESTIONARIOS (se usa en la página y en la vista previa del panel)
       Nada se guarda: ni en el navegador ni en ningún servidor.
       =================================================================== */
    function enlaceCuestionario(q) { return "cuestionarios.html?q=" + encodeURIComponent(q.id); }

    function textoPreguntas(n) { return n + (n === 1 ? " pregunta" : " preguntas"); }

    function crearQuiz(cont, quiz, alSalir) {
        var preguntas = quiz.preguntas || [];
        var esTest = quiz.tipo === "test";
        var resultados = quiz.resultados || [];
        var total = preguntas.length;
        var indice = 0, elegidas = [];

        function html(t) { return enLinea(esc(t)); }

        function mensajeFinal(pct) {
            if (pct === 100) return "¡Perfecto! Respondiste todo bien. 🎉";
            if (pct >= 70) return "¡Muy bien! Sabes bastante del tema.";
            if (pct >= 40) return "Vas por buen camino. Puedes intentarlo otra vez para mejorar.";
            return "¡Buen intento! Inténtalo de nuevo, cada vez se aprende más.";
        }

        function pintarPregunta() {
            var p = preguntas[indice];
            var ops = p.ops.map(function (t, i) {
                return '<label class="quiz-op"><input type="radio" name="quiz-op" value="' + i + '">' +
                    '<span class="quiz-letra">' + String.fromCharCode(65 + i) + '</span>' +
                    '<span class="quiz-texto">' + html(t) + '</span><span class="quiz-marca" aria-hidden="true"></span></label>';
            }).join("");
            cont.innerHTML =
                '<div class="quiz">' +
                '<p class="quiz-progreso">Pregunta ' + (indice + 1) + " de " + total + "</p>" +
                '<div class="quiz-barra" aria-hidden="true"><span style="width:' + Math.round(indice / total * 100) + '%"></span></div>' +
                '<fieldset class="quiz-pregunta"><legend tabindex="-1">' + html(p.p) + "</legend>" + ops + "</fieldset>" +
                '<p class="quiz-feedback" role="status" aria-live="polite"></p>' +
                '<div class="acciones"><button type="button" class="principal quiz-comprobar"' + (esTest ? " hidden" : " disabled") + ">Comprobar</button>" +
                '<button type="button" class="principal quiz-siguiente"' + (esTest ? " disabled" : " hidden") + ">" +
                (indice === total - 1 ? "Ver mi resultado" : "Siguiente pregunta →") + "</button></div></div>";

            var boton = $(".quiz-comprobar", cont), siguiente = $(".quiz-siguiente", cont);
            var radios = cont.querySelectorAll('input[name="quiz-op"]');
            for (var i = 0; i < radios.length; i++) {
                radios[i].addEventListener("change", function () {
                    boton.disabled = false;
                    if (esTest) { elegidas[indice] = parseInt(this.value, 10); siguiente.disabled = false; }
                });
                if (esTest && elegidas[indice] === i) { radios[i].checked = true; siguiente.disabled = false; }
            }
            boton.addEventListener("click", function () {
                var marcada = cont.querySelector('input[name="quiz-op"]:checked');
                if (!marcada) return;
                var elegida = parseInt(marcada.value, 10);
                elegidas[indice] = elegida;
                var etiquetas = cont.querySelectorAll(".quiz-op");
                for (var k = 0; k < etiquetas.length; k++) {
                    radios[k].disabled = true;
                    if (k === p.c) { etiquetas[k].className += " correcta"; $(".quiz-marca", etiquetas[k]).textContent = "✓ Correcta"; }
                    else if (k === elegida) { etiquetas[k].className += " incorrecta"; $(".quiz-marca", etiquetas[k]).textContent = "✗ Tu respuesta"; }
                }
                var fb = $(".quiz-feedback", cont);
                fb.className += elegida === p.c ? " bien" : " mal";
                fb.innerHTML = (elegida === p.c ? "<strong>¡Correcto!</strong>" : "<strong>No es esa.</strong> La respuesta correcta es la " +
                    String.fromCharCode(65 + p.c) + ".") + (p.exp ? " " + html(p.exp) : "");
                boton.hidden = true;
                siguiente.hidden = false;
                siguiente.focus();
            });
            siguiente.addEventListener("click", function () {
                indice++;
                if (indice < total) pintarPregunta(); else if (esTest) pintarResultadoTest(); else pintarResultado();
            });
            $("legend", cont).focus();
        }

        function pintarResultadoTest() {
            var puntos = resultados.map(function () { return 0; });
            preguntas.forEach(function (p, i) {
                (p.pts[elegidas[i]] || []).forEach(function (r) { puntos[r]++; });
            });
            var max = Math.max.apply(null, puntos);
            var ganadores = [];
            puntos.forEach(function (v, i) { if (v === max && max > 0) ganadores.push(i); });
            var principal = resultados[ganadores[0]] || { n: "Sin resultado", d: "" };
            var otros = ganadores.slice(1).map(function (i) { return "<strong>" + html(resultados[i].n) + "</strong>"; });
            var suma = puntos.reduce(function (a, b) { return a + b; }, 0) || 1;
            var barras = resultados.map(function (r, i) {
                var pct = Math.round(puntos[i] / suma * 100);
                return '<li><span class="quiz-afin-nombre">' + html(r.n) + '</span><span class="quiz-afin-pct">' + pct + '%</span>' +
                    '<div class="quiz-barra" aria-hidden="true"><span style="width:' + pct + '%"></span></div></li>';
            }).join("");
            cont.innerHTML =
                '<div class="quiz quiz-resultado quiz-test">' +
                '<p class="quiz-progreso">Tu resultado</p>' +
                '<h2 class="quiz-puntaje" tabindex="-1">' + html(principal.n) + "</h2>" +
                (principal.d ? "<p>" + html(principal.d) + "</p>" : "") +
                (otros.length ? "<p>También encajas con: " + otros.join(", ") + ".</p>" : "") +
                '<details open><summary>Cómo salió tu resultado</summary><ul class="quiz-afinidad">' + barras + "</ul></details>" +
                '<p class="quiz-privado"><small>Este resultado es solo una orientación y no se guardó en ningún lado.</small></p>' +
                '<div class="acciones"><button type="button" class="principal quiz-reintentar">Hacer el test de nuevo</button>' +
                (alSalir ? '<button type="button" class="quiz-otros">Ver otros cuestionarios</button>' : "") + "</div></div>";
            $(".quiz-reintentar", cont).addEventListener("click", function () {
                indice = 0; elegidas = []; pintarPregunta();
            });
            var otro = $(".quiz-otros", cont);
            if (otro) otro.addEventListener("click", alSalir);
            $(".quiz-puntaje", cont).focus();
        }

        function pintarResultado() {
            var aciertos = 0;
            preguntas.forEach(function (p, i) { if (elegidas[i] === p.c) aciertos++; });
            var pct = Math.round(aciertos / total * 100);
            var repaso = preguntas.map(function (p, i) {
                var bien = elegidas[i] === p.c;
                return '<li class="' + (bien ? "bien" : "mal") + '"><strong>' + html(p.p) + "</strong><br>" +
                    (bien ? "✓ Respondiste: " + html(p.ops[p.c])
                        : "✗ Respondiste: " + html(p.ops[elegidas[i]]) + "<br>✓ Correcta: " + html(p.ops[p.c])) + "</li>";
            }).join("");
            cont.innerHTML =
                '<div class="quiz quiz-resultado">' +
                '<p class="quiz-progreso">Resultado</p>' +
                '<h2 class="quiz-puntaje" tabindex="-1">' + aciertos + " de " + total + " (" + pct + "%)</h2>" +
                "<p>" + mensajeFinal(pct) + "</p>" +
                '<div class="quiz-barra" aria-hidden="true"><span style="width:' + pct + '%"></span></div>' +
                '<details><summary>Ver mis respuestas</summary><ol class="quiz-repaso">' + repaso + "</ol></details>" +
                '<p class="quiz-privado"><small>Tus respuestas no se guardaron en ningún lado.</small></p>' +
                '<div class="acciones"><button type="button" class="principal quiz-reintentar">Intentar de nuevo</button>' +
                (alSalir ? '<button type="button" class="quiz-otros">Ver otros cuestionarios</button>' : "") + "</div></div>";
            $(".quiz-reintentar", cont).addEventListener("click", function () {
                indice = 0; elegidas = []; pintarPregunta();
            });
            var otros = $(".quiz-otros", cont);
            if (otros) otros.addEventListener("click", alSalir);
            $(".quiz-puntaje", cont).focus();
        }

        if (!total) { cont.innerHTML = "<p>Este cuestionario todavía no tiene preguntas.</p>"; return; }
        pintarPregunta();
    }

    function tarjetaCuestionario(q) {
        var sec = document.createElement("section");
        var foto = q.imagenMini || q.imagen;
        sec.className = "entrada" + (foto ? "" : " sin-imagen");
        var partes = [];
        if (q.fecha) partes.push(esc(formatoFecha(q.fecha)));
        if (q.autor) partes.push("Por " + esc(q.autor));
        partes.push(textoPreguntas(q.preguntas.length));
        partes.push(q.tipo === "test" ? "Test de resultados" : "Con respuestas correctas");
        sec.innerHTML =
            (foto ? '<a class="entrada-img" href="' + enlaceCuestionario(q) + '" tabindex="-1" aria-hidden="true">' +
                '<img src="' + urlImagen(foto) + '" alt="" loading="lazy"></a>' : "") +
            '<div class="entrada-texto">' +
            '<h2 class="entrada-titulo"><a href="' + enlaceCuestionario(q) + '">' + esc(q.titulo) + "</a></h2>" +
            '<p class="entrada-meta">' + partes.join(" · ") + "</p>" +
            (q.resumen ? "<p>" + esc(q.resumen) + "</p>" : "") +
            '<p><a class="leer-mas" href="' + enlaceCuestionario(q) + '">Resolver cuestionario →</a></p>' +
            "</div>";
        return sec;
    }

    /* ===================================================================
       PÁGINA: CUESTIONARIOS
       =================================================================== */
    function iniciarCuestionarios() {
        var sec = buscarSeccion("cuestionarios") || { titulo: "Cuestionarios", descripcion: "" };
        pintarMenu("cuestionarios");
        $("#sec-titulo").textContent = sec.titulo;
        $("#sec-desc").textContent = sec.descripcion || "";

        var cabecera = $("#q-cabecera"), lista = $("#q-lista"), vista = $("#q-vista"), juego = $("#q-juego");
        var todos = ordenarPorFecha(DATOS.cuestionarios);

        function mostrarLista() {
            vista.hidden = true; cabecera.hidden = false; lista.hidden = false;
            document.title = sec.titulo + " · Revista Gonzalina";
            lista.innerHTML = "";
            if (!todos.length) {
                lista.innerHTML = '<section class="vacio"><p>Todavía no hay cuestionarios. ¡Muy pronto habrá novedades!</p></section>';
                return;
            }
            todos.forEach(function (q) { lista.appendChild(tarjetaCuestionario(q)); });
        }

        function abrir(q) {
            cabecera.hidden = true; lista.hidden = true; vista.hidden = false;
            document.title = q.titulo + " · Revista Gonzalina";
            var meta = [];
            if (q.fecha) meta.push(esc(formatoFecha(q.fecha)));
            if (q.autor) meta.push("Por " + esc(q.autor));
            meta.push(textoPreguntas(q.preguntas.length));
            meta.push(q.tipo === "test" ? "Test de resultados" : "Con respuestas correctas");
            $("#q-titulo").textContent = q.titulo;
            $("#q-meta").innerHTML = meta.join(" · ");
            $("#q-intro").innerHTML = q.intro ? markdown(q.intro) : "";
            crearQuiz(juego, q, function () { cerrar(true); });
            window.scrollTo(0, 0);
            var cont = document.querySelector(".container");
            if (cont && cont.scrollTo) cont.scrollTo(0, 0);
        }

        function cerrar(empujar) {
            if (empujar) { try { history.pushState({}, "", "cuestionarios.html"); } catch (e) { /* sin historial */ } }
            mostrarLista();
        }

        function buscarPorId(id) {
            for (var i = 0; i < todos.length; i++) if (todos[i].id === id) return todos[i];
            return null;
        }

        lista.addEventListener("click", function (e) {
            var a = e.target.closest ? e.target.closest("a") : null;
            if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
            var m = /[?&]q=([^&]+)/.exec(a.getAttribute("href") || "");
            var q = m && buscarPorId(decodeURIComponent(m[1]));
            if (!q) return;
            e.preventDefault();
            try { history.pushState({ q: q.id }, "", enlaceCuestionario(q)); } catch (err) { /* sin historial */ }
            abrir(q);
        });
        $("#q-volver").addEventListener("click", function (e) { e.preventDefault(); cerrar(true); });
        window.addEventListener("popstate", function () {
            var id = new URLSearchParams(location.search).get("q");
            var q = id && buscarPorId(id);
            if (q) abrir(q); else mostrarLista();
        });

        var pedido = new URLSearchParams(location.search).get("q");
        var q0 = pedido && buscarPorId(pedido);
        if (q0) abrir(q0);
        else {
            mostrarLista();
            if (pedido) {
                var aviso = document.createElement("section");
                aviso.className = "vacio";
                aviso.innerHTML = "<p>No encontramos ese cuestionario. Mira los que hay disponibles:</p>";
                lista.insertBefore(aviso, lista.firstChild);
            }
        }
    }

    /* ===================================================================
       PÁGINA DE INICIO: "lo más nuevo"
       =================================================================== */
    function iniciarInicio() {
        pintarMenu("inicio");
        var arts = document.getElementById("ultimos-articulos");
        var fotos = document.getElementById("ultimas-fotos");
        var quizzes = document.getElementById("ultimos-cuestionarios");

        if (quizzes) {
            var nuevos = ordenarPorFecha(DATOS.cuestionarios).slice(0, 3);
            quizzes.innerHTML = nuevos.length
                ? nuevos.map(function (q) {
                    return '<div class="ultimo"><h3><a href="' + enlaceCuestionario(q) + '">' + esc(q.titulo) + "</a></h3>" +
                        '<p class="entrada-meta">' + (q.fecha ? esc(formatoFecha(q.fecha)) + " · " : "") + textoPreguntas(q.preguntas.length) +
                        (q.tipo === "test" ? " · Test" : "") + "</p>" +
                        (q.resumen ? "<p>" + esc(q.resumen) + "</p>" : "") + "</div>";
                }).join("")
                : "<p>Pronto publicaremos aquí los primeros cuestionarios.</p>";
        }

        if (arts) {
            var recientes = ordenarPorFecha(DATOS.articulos).slice(0, 3);
            arts.innerHTML = recientes.length
                ? recientes.map(function (a) {
                    return '<div class="ultimo"><h3><a href="' + enlaceArticulo(a) + '">' + esc(a.titulo) + "</a></h3>" +
                        '<p class="entrada-meta">' + metaArticulo(a, true) + "</p>" +
                        (a.resumen ? "<p>" + esc(a.resumen) + "</p>" : "") + "</div>";
                }).join("")
                : "<p>Pronto publicaremos aquí los primeros artículos.</p>";
        }
        if (fotos) {
            var nuevas = DATOS.fotos.slice(0, 5);
            if (nuevas.length) {
                fotos.innerHTML = nuevas.map(function (f) {
                    return '<div><a href="galeria.html"><img alt="' + esc(f.pie) + '" loading="lazy" src="' +
                        (f.mini ? rutaArchivo(f.mini) : "fotos/" + rutaArchivo(f.archivo)) + '"></a></div>';
                }).join("");
            } else {
                fotos.outerHTML = "<p>Pronto verás aquí las últimas fotos del muro.</p>";
            }
        }
    }

    /* ===================================================================
       PÁGINA: PANEL PARA PUBLICAR (solo el equipo)
       =================================================================== */
    function hacerSlug(t) {
        var s = normalizar(t).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "");
        return s || "articulo";
    }

    function hoyISO() {
        var d = new Date();
        return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    }

    function copiarTexto(texto) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(texto);
        }
        return new Promise(function (ok, fallo) {
            var t = document.createElement("textarea");
            t.value = texto; t.style.position = "fixed"; t.style.opacity = "0";
            document.body.appendChild(t); t.select();
            try { document.execCommand("copy") ? ok() : fallo(); } catch (e) { fallo(e); }
            document.body.removeChild(t);
        });
    }

    function iniciarPublicar() {
        pintarMenu("");
        var gh = "https://github.com/" + CONFIG.repo;
        var campos = {
            seccion: $("#p-seccion"), titulo: $("#p-titulo"), autor: $("#p-autor"), fecha: $("#p-fecha"),
            resumen: $("#p-resumen"), imagen: $("#p-imagen"), texto: $("#p-texto")
        };
        var aviso = $("#p-aviso");

        CONFIG.secciones.filter(function (s) { return s.tipo === "articulos"; }).forEach(function (s) {
            var o = document.createElement("option");
            o.value = s.id; o.textContent = s.titulo;
            campos.seccion.appendChild(o);
        });
        campos.fecha.value = hoyISO();

        $("#p-link-fotos").href = gh + "/upload/" + CONFIG.rama + "/fotos";
        $("#p-link-imagenes").href = gh + "/upload/" + CONFIG.rama + "/img/articulos";
        $("#p-link-repo").href = gh;

        function unaLinea(v) { return String(v || "").replace(/\s*\n\s*/g, " ").trim(); }

        function construir() {
            var cab = [];
            if (unaLinea(campos.titulo.value)) cab.push("titulo: " + unaLinea(campos.titulo.value));
            if (unaLinea(campos.autor.value)) cab.push("autor: " + unaLinea(campos.autor.value));
            if (unaLinea(campos.fecha.value)) cab.push("fecha: " + unaLinea(campos.fecha.value));
            if (unaLinea(campos.resumen.value)) cab.push("resumen: " + unaLinea(campos.resumen.value));
            if (unaLinea(campos.imagen.value)) cab.push("imagen: " + unaLinea(campos.imagen.value));
            var contenido = cab.join("\n") + "\n\n" + campos.texto.value.replace(/\s+$/, "") + "\n";
            var fecha = /^\d{4}-\d{2}-\d{2}$/.test(campos.fecha.value) ? campos.fecha.value : hoyISO();
            var nombre = fecha + "-" + hacerSlug(campos.titulo.value) + ".md";
            return { ruta: "articulos/" + campos.seccion.value + "/" + nombre, nombre: nombre, contenido: contenido };
        }

        function vistaPrevia() {
            var a = {
                id: "previa", seccion: campos.seccion.value, titulo: campos.titulo.value || "Título del artículo",
                autor: campos.autor.value, fecha: campos.fecha.value, resumen: campos.resumen.value,
                imagen: campos.imagen.value.trim()
            };
            var cont = $("#p-previa");
            cont.innerHTML =
                "<h1>" + esc(a.titulo) + "</h1>" +
                '<p class="entrada-meta centrado">' + metaArticulo(a, false) + "</p>" +
                (a.imagen ? '<img class="portada image-deco" src="' + urlImagen(a.imagen) + '" alt="">' : "") +
                '<div class="articulo-cuerpo">' + (campos.texto.value.trim() ? markdown(campos.texto.value) :
                    "<p><em>Aquí verás cómo se verá tu texto mientras lo escribes.</em></p>") + "</div>";
        }

        function mostrarAviso(t) { aviso.textContent = t; aviso.hidden = !t; }

        function validar() {
            if (!campos.titulo.value.trim()) { mostrarAviso("Escribe primero el título del artículo."); campos.titulo.focus(); return false; }
            if (!campos.texto.value.trim()) { mostrarAviso("Escribe el texto del artículo."); campos.texto.focus(); return false; }
            mostrarAviso("");
            return true;
        }

        $("#p-publicar").addEventListener("click", function () {
            if (!validar()) return;
            var r = construir();
            var base = gh + "/new/" + CONFIG.rama + "?filename=" + encodeURIComponent(r.ruta);
            var url = base + "&value=" + encodeURIComponent(r.contenido);
            if (url.length > 7000) {
                copiarTexto(r.contenido).then(function () {
                    mostrarAviso("Tu artículo es largo, así que lo copiamos al portapapeles. En la página de GitHub que se abre, haz clic en el cuadro grande y pega con Ctrl+V (o ⌘+V). Luego pulsa «Commit changes».");
                }, function () {
                    mostrarAviso("Tu artículo es largo y no pudimos copiarlo solo. Pulsa «Copiar texto» aquí, vuelve a la página de GitHub que se abrió y pégalo en el cuadro grande.");
                });
                window.open(base, "_blank", "noopener");
            } else {
                mostrarAviso("Se abrió GitHub con tu artículo listo. Solo falta pulsar el botón verde «Commit changes…» y confirmar. En un minuto aparecerá en la revista.");
                window.open(url, "_blank", "noopener");
            }
        });

        $("#p-copiar").addEventListener("click", function () {
            if (!validar()) return;
            copiarTexto(construir().contenido).then(
                function () { mostrarAviso("Texto copiado. Guárdalo en un archivo .md dentro de la carpeta articulos/" + campos.seccion.value + "/"); },
                function () { mostrarAviso("No pude copiar automáticamente. Selecciona el texto a mano."); }
            );
        });

        $("#p-descargar").addEventListener("click", function () {
            if (!validar()) return;
            var r = construir();
            var blob = new Blob([r.contenido], { type: "text/markdown;charset=utf-8" });
            var a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = r.nombre;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
            mostrarAviso("Archivo descargado: " + r.nombre + ". Súbelo a la carpeta articulos/" + campos.seccion.value + "/ del repositorio.");
        });

        Object.keys(campos).forEach(function (k) {
            campos[k].addEventListener("input", vistaPrevia);
            campos[k].addEventListener("change", vistaPrevia);
        });
        vistaPrevia();
        iniciarConstructorQuiz(gh);
    }

    /* ---------- panel: constructor de cuestionarios ---------- */
    function iniciarConstructorQuiz(gh) {
        var form = $("#qz-form");
        if (!form) return;
        var campos = {
            titulo: $("#qz-titulo"), autor: $("#qz-autor"), fecha: $("#qz-fecha"),
            resumen: $("#qz-resumen"), imagen: $("#qz-imagen"), intro: $("#qz-intro")
        };
        var lista = $("#qz-preguntas"), aviso = $("#qz-aviso");
        var tipo = $("#qz-tipo"), resWrap = $("#qz-resultados-wrap"), resLista = $("#qz-resultados");
        var contador = 0;

        function esTest() { return tipo.value === "test"; }

        // nombres de resultado: sin ":" ni "," ni flechas, que el robot usa para separar
        function limpiarNombre(v) {
            return String(v || "").replace(/->|=>|→/g, " ").replace(/[:,]/g, " ").replace(/\s+/g, " ").trim();
        }

        function nombresResultados() {
            var filas = resLista.querySelectorAll(".qz-res");
            return Array.prototype.map.call(filas, function (f) { return limpiarNombre($(".qz-rn", f).value); });
        }

        function refrescarSelects() {
            var nombres = nombresResultados();
            var selects = lista.querySelectorAll(".qz-rsel");
            for (var i = 0; i < selects.length; i++) {
                var previo = selects[i].value;
                selects[i].innerHTML = '<option value="-1">¿A qué resultado suma?</option>' + nombres.map(function (n, k) {
                    return '<option value="' + k + '">' + esc(n || "Resultado " + (k + 1)) + "</option>";
                }).join("");
                if (previo !== "" && +previo < nombres.length) selects[i].value = previo;
            }
        }

        function agregarResultado() {
            var f = document.createElement("div");
            f.className = "qz-res";
            f.innerHTML =
                '<label class="campo"><span class="qz-res-num"></span><input type="text" class="qz-rn" maxlength="60" placeholder="Nombre del resultado (ej. Ciencias y tecnología)"></label>' +
                '<label class="campo"><span>Descripción</span><textarea class="qz-rd" style="min-height: 70px" placeholder="Qué significa este resultado"></textarea></label>' +
                '<button type="button" class="qz-quitar">Quitar este resultado</button>';
            $(".qz-rn", f).addEventListener("input", refrescarSelects);
            $(".qz-quitar", f).addEventListener("click", function () {
                resLista.removeChild(f); numerarResultados(); refrescarSelects();
            });
            resLista.appendChild(f);
            numerarResultados();
            refrescarSelects();
        }

        function numerarResultados() {
            var filas = resLista.querySelectorAll(".qz-res");
            for (var i = 0; i < filas.length; i++) {
                $(".qz-res-num", filas[i]).textContent = "Resultado " + (i + 1);
                $(".qz-quitar", filas[i]).hidden = filas.length <= 2;
            }
        }

        function aplicarTipo() {
            var test = esTest();
            resWrap.hidden = !test;
            if (test && !resLista.children.length) { agregarResultado(); agregarResultado(); agregarResultado(); }
            var bloques = lista.querySelectorAll(".qz-preg");
            for (var i = 0; i < bloques.length; i++) {
                var radios = bloques[i].querySelectorAll('input[type="radio"]'), sels = bloques[i].querySelectorAll(".qz-rsel");
                for (var k = 0; k < radios.length; k++) { radios[k].hidden = test; sels[k].hidden = !test; }
                $(".qz-ayuda-quiz", bloques[i]).hidden = test;
                $(".qz-ayuda-test", bloques[i]).hidden = !test;
                $(".qz-exp", bloques[i]).parentNode.hidden = test;
            }
            refrescarSelects();
            mostrarAviso("");
        }
        campos.fecha.value = hoyISO();

        function mostrarAviso(t) { aviso.textContent = t; aviso.hidden = !t; }

        function numerar() {
            var bloques = lista.querySelectorAll(".qz-preg");
            for (var i = 0; i < bloques.length; i++) {
                $(".qz-num", bloques[i]).textContent = "Pregunta " + (i + 1);
                $(".qz-quitar", bloques[i]).hidden = bloques.length <= 1;
            }
        }

        function agregarPregunta() {
            contador++;
            var n = contador, b = document.createElement("fieldset");
            b.className = "qz-preg";
            var ops = "";
            for (var i = 0; i < 4; i++) {
                ops += '<div class="qz-op"><input type="radio" name="qz-c' + n + '" value="' + i + '" aria-label="Marcar la opción ' +
                    String.fromCharCode(65 + i) + ' como correcta"><input type="text" class="qz-opt" maxlength="160" placeholder="Opción ' +
                    String.fromCharCode(65 + i) + (i < 2 ? "" : " (opcional)") + '"><select class="qz-rsel" hidden aria-label="Resultado al que suma la opción ' +
                    String.fromCharCode(65 + i) + '"></select></div>';
            }
            b.innerHTML =
                '<legend class="qz-num"></legend>' +
                '<label class="campo"><span>Pregunta</span><input type="text" class="qz-p" maxlength="200"></label>' +
                '<div class="campo"><span>Opciones <small class="qz-ayuda-quiz">(marca con el círculo cuál es la correcta)</small><small class="qz-ayuda-test" hidden>(elige a qué resultado suma cada opción)</small></span>' + ops + "</div>" +
                '<label class="campo"><span>Explicación (opcional)</span><input type="text" class="qz-exp" maxlength="300">' +
                "<small>Se muestra después de responder.</small></label>" +
                '<button type="button" class="qz-quitar">Quitar esta pregunta</button>';
            $(".qz-quitar", b).addEventListener("click", function () {
                lista.removeChild(b); numerar(); mostrarAviso("");
            });
            lista.appendChild(b);
            numerar();
            aplicarTipo();
        }

        function leerTest() {
            var errores = [], resultados = [], preguntas = [];
            var filas = resLista.querySelectorAll(".qz-res"), vistos = {};
            for (var r = 0; r < filas.length; r++) {
                var n = limpiarNombre($(".qz-rn", filas[r]).value);
                if (!n) { errores.push("Resultado " + (r + 1) + ": escribe su nombre."); continue; }
                if (vistos[normalizar(n)]) { errores.push("Hay dos resultados con el nombre «" + n + "»."); continue; }
                vistos[normalizar(n)] = true;
                resultados.push({ n: n, d: unaL($(".qz-rd", filas[r]).value), i: r });
            }
            if (resultados.length < 2 && !errores.length) errores.push("Escribe al menos 2 resultados posibles.");
            var bloques = lista.querySelectorAll(".qz-preg");
            for (var i = 0; i < bloques.length; i++) {
                var b = bloques[i];
                var p = unaL($(".qz-p", b).value);
                var entradas = b.querySelectorAll(".qz-opt"), sels = b.querySelectorAll(".qz-rsel");
                var ops = [], pts = [], sinResultado = false;
                for (var k = 0; k < entradas.length; k++) {
                    var t = unaL(entradas[k].value).replace(/->|=>|→/g, "-");
                    if (!t) continue;
                    var v = parseInt(sels[k].value, 10);
                    if (!(v >= 0)) sinResultado = true;
                    ops.push(t); pts.push(v);
                }
                if (!p && !ops.length) continue;
                var nombre = "Pregunta " + (i + 1) + ": ";
                if (!p) errores.push(nombre + "escribe la pregunta.");
                else if (ops.length < 2) errores.push(nombre + "escribe al menos 2 opciones.");
                else if (sinResultado) errores.push(nombre + "elige a qué resultado suma cada opción.");
                else preguntas.push({ p: p, ops: ops, pts: pts });
            }
            return { errores: errores, preguntas: preguntas, resultados: resultados };
        }

        function leer() {
            if (esTest()) return leerTest();
            var errores = [], preguntas = [];
            var bloques = lista.querySelectorAll(".qz-preg");
            for (var i = 0; i < bloques.length; i++) {
                var b = bloques[i];
                var p = unaL($(".qz-p", b).value);
                var entradas = b.querySelectorAll(".qz-opt"), radios = b.querySelectorAll('input[type="radio"]');
                var ops = [], correcta = -1, marcada = -1;
                for (var k = 0; k < entradas.length; k++) {
                    if (radios[k].checked) marcada = k;
                    var t = unaL(entradas[k].value);
                    if (t) { if (k === marcada) correcta = ops.length; ops.push(t); }
                }
                var todoVacio = !p && !ops.length;
                if (todoVacio) continue;
                var nombre = "Pregunta " + (i + 1) + ": ";
                if (!p) errores.push(nombre + "escribe la pregunta.");
                else if (ops.length < 2) errores.push(nombre + "escribe al menos 2 opciones.");
                else if (marcada < 0) errores.push(nombre + "marca cuál es la respuesta correcta.");
                else if (!unaL(entradas[marcada].value)) errores.push(nombre + "la opción marcada como correcta está vacía.");
                else preguntas.push({ p: p, ops: ops, c: correcta, exp: unaL($(".qz-exp", b).value) });
            }
            return { errores: errores, preguntas: preguntas };
        }

        function unaL(v) { return String(v || "").replace(/\s*\n\s*/g, " ").trim(); }

        var ultimosResultados = [];

        function objeto(preguntas) {
            var o = {
                titulo: unaL(campos.titulo.value) || "Cuestionario", autor: unaL(campos.autor.value),
                fecha: campos.fecha.value, intro: campos.intro.value.trim(), preguntas: preguntas, tipo: "quiz"
            };
            if (esTest()) {
                var idx = {};
                o.tipo = "test";
                o.resultados = ultimosResultados.map(function (r, k) { idx[r.i] = k; return { n: r.n, d: r.d }; });
                o.preguntas = preguntas.map(function (q) {
                    return { p: q.p, ops: q.ops, pts: q.pts.map(function (v) { return [idx[v]]; }), exp: "" };
                });
            }
            return o;
        }

        function validar() {
            if (!unaL(campos.titulo.value)) { mostrarAviso("Escribe primero el título del cuestionario."); campos.titulo.focus(); return null; }
            var r = leer();
            if (r.errores.length) { mostrarAviso(r.errores.join(" ")); return null; }
            ultimosResultados = r.resultados || [];
            if (!r.preguntas.length) { mostrarAviso("Agrega al menos una pregunta completa."); return null; }
            mostrarAviso("");
            return r.preguntas;
        }

        function construir(preguntas) {
            var cab = ["titulo: " + unaL(campos.titulo.value)];
            if (unaL(campos.autor.value)) cab.push("autor: " + unaL(campos.autor.value));
            if (unaL(campos.fecha.value)) cab.push("fecha: " + unaL(campos.fecha.value));
            if (unaL(campos.resumen.value)) cab.push("resumen: " + unaL(campos.resumen.value));
            if (unaL(campos.imagen.value)) cab.push("imagen: " + unaL(campos.imagen.value));
            if (esTest()) cab.splice(cab.length, 0, "tipo: test");
            var texto = cab.join("\n") + "\n\n";
            if (campos.intro.value.trim()) texto += campos.intro.value.trim() + "\n\n";
            if (esTest()) {
                texto += ultimosResultados.map(function (r) { return "@ " + r.n + ": " + (r.d || r.n); }).join("\n") + "\n\n";
                texto += preguntas.map(function (q) {
                    return "## " + q.p + "\n" + q.ops.map(function (o, i) {
                        return "- " + o + " -> " + ultimosResultados.filter(function (r) { return r.i === q.pts[i]; })[0].n;
                    }).join("\n");
                }).join("\n\n") + "\n";
                return finalizar(texto);
            }
            texto += preguntas.map(function (q) {
                return "## " + q.p + "\n" + q.ops.map(function (o, i) { return "- " + o + (i === q.c ? " *" : ""); }).join("\n") +
                    (q.exp ? "\n> " + q.exp : "");
            }).join("\n\n") + "\n";
            return finalizar(texto);
        }

        function finalizar(texto) {
            var fecha = /^\d{4}-\d{2}-\d{2}$/.test(campos.fecha.value) ? campos.fecha.value : hoyISO();
            var nombre = fecha + "-" + hacerSlug(campos.titulo.value) + ".md";
            return { ruta: "articulos/cuestionarios/" + nombre, nombre: nombre, contenido: texto };
        }

        tipo.addEventListener("change", aplicarTipo);
        $("#qz-agregar-res").addEventListener("click", function () {
            agregarResultado();
            var ult = resLista.lastElementChild; if (ult) $(".qz-rn", ult).focus();
        });

        $("#qz-agregar").addEventListener("click", function () {
            agregarPregunta();
            var ult = lista.lastElementChild; if (ult) $(".qz-p", ult).focus();
        });

        $("#qz-probar").addEventListener("click", function () {
            var pr = validar();
            if (!pr) return;
            var cont = $("#qz-previa");
            cont.hidden = false;
            crearQuiz(cont, objeto(pr), null);
            cont.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        $("#qz-publicar").addEventListener("click", function () {
            var pr = validar();
            if (!pr) return;
            var r = construir(pr);
            var base = gh + "/new/" + CONFIG.rama + "?filename=" + encodeURIComponent(r.ruta);
            var url = base + "&value=" + encodeURIComponent(r.contenido);
            if (url.length > 7000) {
                copiarTexto(r.contenido).then(function () {
                    mostrarAviso("Tu cuestionario es largo, así que lo copiamos al portapapeles. En la página de GitHub que se abre, haz clic en el cuadro grande y pega con Ctrl+V (o ⌘+V). Luego pulsa «Commit changes».");
                }, function () {
                    mostrarAviso("Tu cuestionario es largo y no pudimos copiarlo solo. Pulsa «Copiar texto» aquí y pégalo en el cuadro grande de GitHub.");
                });
                window.open(base, "_blank", "noopener");
            } else {
                mostrarAviso("Se abrió GitHub con tu cuestionario listo. Solo falta pulsar el botón verde «Commit changes…» y confirmar. En un minuto aparecerá en la revista.");
                window.open(url, "_blank", "noopener");
            }
        });

        $("#qz-copiar").addEventListener("click", function () {
            var pr = validar();
            if (!pr) return;
            copiarTexto(construir(pr).contenido).then(
                function () { mostrarAviso("Texto copiado. Guárdalo en un archivo .md dentro de la carpeta articulos/cuestionarios/"); },
                function () { mostrarAviso("No pude copiar automáticamente."); }
            );
        });

        agregarPregunta();
        agregarPregunta();
    }

    /* ===================================================================
       ARRANQUE
       =================================================================== */
    function arrancar() {
        iniciarFuente();
        var pagina = document.body.getAttribute("data-pagina");
        if (pagina === "inicio") iniciarInicio();
        else if (pagina === "seccion") iniciarSeccion();
        else if (pagina === "galeria") iniciarGaleria();
        else if (pagina === "cuestionarios") iniciarCuestionarios();
        else if (pagina === "articulo") iniciarArticulo();
        else if (pagina === "publicar") iniciarPublicar();
        else if (pagina === "creditos") pintarMenu("creditos");
        else pintarMenu("");
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar);
    else arrancar();
})();
