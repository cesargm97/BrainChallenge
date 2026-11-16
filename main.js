// ============================================================
// Configuración
// ============================================================
const API_URL = 'http://localhost:3000';

//ver fecha legible (agregar    )
function fechaAmigable(fechaStr) {
    // fechaStr = "2026-11-16 14:30:00"
    if (!fechaStr) return '';

    const partes = fechaStr.split(' ');
    if (partes.length < 2) return fechaStr;  // si no hay hora, devolver tal cual

    const [fecha, hora] = partes;
    const [y, m, d] = fecha.split('-').map(Number);
    const [hh, mm] = hora.split(':').map(Number);

    const fechaIntento = new Date(y, m - 1, d, hh, mm);
    const ahora = new Date();

    const diffMs = ahora - fechaIntento;
    const diffMin = Math.floor(diffMs / 60000);
    const diffDias = Math.floor(diffMs / 86400000);

    // Mismo día
    if (fechaIntento.toDateString() === ahora.toDateString()) {
        if (diffMin < 1) return 'Hace un momento';
        if (diffMin < 60) return `Hace ${diffMin} min`;
        return `Hoy ${hora.slice(0, 5)}`;
    }

    // Ayer
    const ayer = new Date(ahora);
    ayer.setDate(ahora.getDate() - 1);
    if (fechaIntento.toDateString() === ayer.toDateString()) {
        return `Ayer ${hora.slice(0, 5)}`;
    }

    // Últimos 7 días
    if (diffDias < 7) {
        return `Hace ${diffDias} día${diffDias > 1 ? 's' : ''}`;
    }

    // Más antiguo
    return fecha;
}

// ============================================================
// Estado del juego
// ============================================================
let categorias = [];
let categoriaActual = null;
let preguntas = [];
let indiceActual = 0;
let puntaje = 0;
let respuestasUsuario = [];
let USUARIO_ACTUAL_ID = null;
let chartInstance = null;


// Elementos del DOM
const contenedorUsuario = document.querySelector('#contenedor-usuario');
//const selectorUsuario = document.querySelector('#selector-usuario');
const contenedorPregunta = document.querySelector('#contenedor-preguntas');
const contenedorOpciones = document.querySelector('#contenedor-opciones');
const contenedorResultado = document.querySelector('#contenedor-resultado');
const contenedorHistorial = document.querySelector('#contenedor-historial');




// Arranque
document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
});

/*(queda sin efecto para el login)
async function cargarUsuarios() {
    try {
        const res = await fetch(`${API_URL}/api/usuarios`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        selectorUsuario.innerHTML = '';

        data.usuarios.forEach((u) => {
            const opt = document.createElement('option');
            opt.value = u.ID_USUARIO;
            opt.textContent = `${u.NOMBRE} (${u.ROL})`;
            selectorUsuario.appendChild(opt);
        });

        USUARIO_ACTUAL_ID = Number(selectorUsuario.value);

        // Escuchar cambios de usuario
        selectorUsuario.addEventListener('change', (e) => {
            USUARIO_ACTUAL_ID = Number(e.target.value);

            // Si el historial está visible, recargarlo para el nuevo usuario
            if (contenedorHistorial.innerHTML.trim() !== '') {
                mostrarHistorial();
            }
        });

        mostrarTemas();

    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        contenedorPregunta.innerHTML = '<h2 class="pregunta">Error</h2>';
        contenedorOpciones.innerHTML = `<p class="mensaje error">No se pudieron cargar los usuarios.<br>${error.message}</p>`;
    }
}*/


// 1) Mostrar temas ( o categorías) — fetch a la API

async function mostrarTemas() {
    contenedorResultado.innerHTML = '';
    contenedorHistorial.innerHTML = '';
    const canvas = document.getElementById('grafico-progreso');
    if (canvas) canvas.style.display = 'none';
    contenedorPregunta.innerHTML = '<h2 class="pregunta">Cargando temas...</h2>';
    contenedorOpciones.innerHTML = '';

    // ⬇️ Determinar si el usuario actual es admin (ANTES del try)
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const esAdmin = usuario.rol === 'ADMIN';

    try {
        const res = await fetch(`${API_URL}/api/categorias`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        categorias = data.categorias;

        contenedorPregunta.innerHTML = '<h2 class="pregunta">Selecciona el tema:</h2>';

        categorias.forEach((cat) => {
            const p = document.createElement('p');
            p.className = 'opcion';
            p.textContent = cat.NOMBRE;
            p.dataset.id = cat.ID_CATEGORIA;
            p.addEventListener('click', () => seleccionarTema(cat));
            contenedorOpciones.appendChild(p);
        });

        // Botones de acceso rápido
        const acciones = document.createElement('div');
        acciones.className = 'botones-accion';
        acciones.innerHTML = `
            <button id="historialBtn" class="boton-secundario">📋 Mi historial</button>
            <button id="exportarDirectoBtn" class="boton-secundario">📥 Exportar CSV</button>
            <button id="rankingBtn" class="boton-secundario">🏆 Ver ranking global</button>
            <button id="misEstadisticasBtn" class="boton-secundario">📊 Mis estadísticas</button>
            ${esAdmin ? '<button id="adminBtn" class="boton-secundario">🛡️ Panel admin</button>' : ''}
        `;

        contenedorOpciones.appendChild(acciones);

        contenedorOpciones.querySelector('#rankingBtn').addEventListener('click', mostrarRanking);
        contenedorOpciones.querySelector('#misEstadisticasBtn').addEventListener('click', () => mostrarEstadisticas());
        contenedorOpciones.querySelector('#historialBtn').addEventListener('click', () => mostrarHistorial());
        contenedorOpciones.querySelector('#exportarDirectoBtn').addEventListener('click', exportarHistorialCSV);

        if (esAdmin) {
            contenedorOpciones.querySelector('#adminBtn').addEventListener('click', mostrarPanelAdmin);
        }

    } catch (error) {
        console.error('Error al cargar categorías:', error);
        contenedorPregunta.innerHTML = '<h2 class="pregunta">Error</h2>';
        contenedorOpciones.innerHTML = `<p class="mensaje error">No se pudieron cargar los temas.<br>${error.message}</p>`;
    }
}

// 2) Seleccionar tema  o cargar preguntas de esa categoría
async function seleccionarTema(categoria) {
    categoriaActual = categoria;
    indiceActual = 0;
    puntaje = 0;
    respuestasUsuario = [];

    contenedorResultado.innerHTML = '';
    contenedorPregunta.innerHTML = '<h2 class="pregunta">Cargando preguntas...</h2>';
    contenedorOpciones.innerHTML = '';

    try {
        // 2a) Preguntas de la categoría
        const resPreguntas = await fetch(`${API_URL}/api/preguntas?categoria=${categoria.ID_CATEGORIA}`);
        if (!resPreguntas.ok) throw new Error(`HTTP ${resPreguntas.status}`);
        const dataPreguntas = await resPreguntas.json();

        if (dataPreguntas.total === 0) {
            contenedorPregunta.innerHTML = '<h2 class="pregunta">Sin preguntas</h2>';
            contenedorOpciones.innerHTML = `<p class="mensaje">Esta categoría aún no tiene preguntas.</p>`;
            return;
        }

        // 2b) Para cada pregunta, traer sus opciones en paralelo
        const promesas = dataPreguntas.preguntas.map(async (p) => {
            const resOpc = await fetch(`${API_URL}/api/preguntas/${p.ID_PREGUNTA}/opciones`);
            const dataOpc = await resOpc.json();
            return {
                ...p,
                OPCIONES: dataOpc.opciones || []
            };
        });

        preguntas = await Promise.all(promesas);

        // 2c) Mostrar la primera
        mostrarPregunta(0);

    } catch (error) {
        console.error('Error al cargar preguntas:', error);
        contenedorPregunta.innerHTML = '<h2 class="pregunta">Error</h2>';
        contenedorOpciones.innerHTML = `<p class="mensaje error">No se pudieron cargar las preguntas.<br>${error.message}</p>`;
    }
}

// ============================================================
// 3) Mostrar pregunta actual
// ============================================================
function mostrarPregunta(indice) {
    if (indice >= preguntas.length) {
        mostrarResultado();
        return;
    }

    const pregunta = preguntas[indice];
    contenedorPregunta.innerHTML = `<h2 class="pregunta">${pregunta.ENUNCIADO}</h2>`;
    mostrarOpciones(pregunta, indice);
}

// ============================================================
// 4) Mostrar opciones y manejar click
// ============================================================
function mostrarOpciones(pregunta, indice) {
    contenedorOpciones.innerHTML = '';

    pregunta.OPCIONES.forEach((opcion) => {
        const p = document.createElement('p');
        p.className = 'opcion';
        p.textContent = opcion.DESCRIPCION;
        p.dataset.id = opcion.ID_OPCION;
        p.addEventListener('click', () => manejarRespuesta(p, opcion, pregunta, indice));
        contenedorOpciones.appendChild(p);
    });
}

// ============================================================
// 5) Manejar respuesta del usuario
// ============================================================
function manejarRespuesta(elemento, opcion, pregunta, indice) {
    // Evitar doble clic
    if (contenedorOpciones.querySelector('.correcta, .incorrecta, .revelada')) return;

    const esCorrecta = opcion.ES_CORRECTA === 1;

    if (esCorrecta) {
        puntaje++;
        elemento.classList.add('correcta');
        elemento.innerHTML += ' <span class="emoji">✅</span>';
    } else {
        elemento.classList.add('incorrecta');
        elemento.innerHTML += ' <span class="emoji">❌</span>';

        // Revelar la correcta
        const correcta = pregunta.OPCIONES.find((o) => o.ES_CORRECTA === 1);
        if (correcta) {
            const elCorrecta = [...contenedorOpciones.querySelectorAll('.opcion')]
                .find((el) => Number(el.dataset.id) === correcta.ID_OPCION);
            if (elCorrecta) {
                elCorrecta.classList.add('revelada');
                elCorrecta.innerHTML += ' <span class="emoji">✅</span>';
            }
        }
    }

    respuestasUsuario.push({
        idPregunta: pregunta.ID_PREGUNTA,
        idOpcion: opcion.ID_OPCION,
        esCorrecta
    });

    setTimeout(() => {
        mostrarPregunta(indice + 1);
    }, 1200);
}

// ============================================================
// 6) Resultado final + guardar intento en Oracle
// ============================================================

async function mostrarResultado() {
    contenedorPregunta.innerHTML = '';
    contenedorOpciones.innerHTML = '';
    contenedorHistorial.innerHTML = '';

    const total = preguntas.length;
    const porcentaje = total > 0 ? Math.round((puntaje / total) * 100) : 0;

    contenedorResultado.innerHTML = `
        <h2 class="total">Haz acertado ${puntaje} de ${total} preguntas</h2>
        <p class="total" style="font-size: 1.4rem;">(${porcentaje}%)</p>
        <p class="mensaje" id="estado-guardado">Guardando intento...</p>
            <div class="botones-accion">
            <button id="reiniciarBtn">Reiniciar</button>
            <button id="repetirBtn" class="boton-secundario"> Repetir ${categoriaActual.NOMBRE}</button>
            <button id="historialBtn" class="boton-secundario">Ver mi historial</button>
            <button id="estadisticasBtn" class="boton-secundario">Ver mis estadísticas</button>
            </div>
    `;

    // Botón reiniciar
    contenedorResultado.querySelector('#reiniciarBtn').addEventListener('click', () => {
        puntaje = 0;
        indiceActual = 0;
        respuestasUsuario = [];
        mostrarTemas();
    });

    contenedorResultado.querySelector('#repetirBtn').addEventListener('click', () => {
    seleccionarTema(categoriaActual);
    });
    

    // Botón historial
    contenedorResultado.querySelector('#estadisticasBtn').addEventListener('click', () => {
    mostrarEstadisticas();
    });

    // Guardar intento (USA USUARIO ACUA)
    const elEstado = contenedorResultado.querySelector('#estado-guardado');

    try {
        const res = await fetch(`${API_URL}/api/intentos-completo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        id_usuario: USUARIO_ACTUAL_ID,
        id_categoria: categoriaActual.ID_CATEGORIA,
        puntaje: porcentaje,
        total_preguntas: total,
        respuestas_correctas: puntaje,
        respuestas: respuestasUsuario.map(r => ({
            id_pregunta: r.idPregunta,
            id_opcion: r.idOpcion,
            es_correcta: r.esCorrecta
        }))
    })
});

        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || `HTTP ${res.status}`);

        elEstado.textContent = `✅ Intento guardado (ID: ${data.id_intento})`;
        elEstado.classList.add('exito');

    } catch (error) {
        console.error('Error al guardar intento:', error);
        elEstado.textContent = `⚠️ No se pudo guardar el intento: ${error.message}`;
        elEstado.classList.add('error');
    }
}

// ============================================================
// 7) Mostrar historial de intentos
// ============================================================
async function mostrarHistorial() {
    contenedorPregunta.innerHTML = '<h2 class="pregunta">Cargando historial...</h2>';
    contenedorOpciones.innerHTML = '';
    contenedorResultado.innerHTML = '';
    contenedorHistorial.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/api/intentos/${USUARIO_ACTUAL_ID}?limit=100&offset=0`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.total === 0) {
            contenedorPregunta.innerHTML = '<h2 class="pregunta">Mi historial</h2>';
            contenedorHistorial.innerHTML = '<p class="mensaje">No tienes intentos registrados todavía.</p>';
            return;
        }

        contenedorPregunta.innerHTML = '<h2 class="pregunta">Mi historial</h2>';

        const filas = data.intentos.map((i) => {
            const clasePuntaje = i.PUNTAJE >= 70 ? 'puntaje-alto'
                              : i.PUNTAJE >= 40 ? 'puntaje-medio'
                              : 'puntaje-bajo';
            return `
                <tr>
                    <td>${i.ID_INTENTO}</td>
                    <td>${i.CATEGORIA}</td>
                    <td>${i.RESPUESTAS_CORRECTAS}/${i.TOTAL_PREGUNTAS}</td>
                    <td class="${clasePuntaje}">${i.PUNTAJE}%</td>
                    <td>${fechaAmigable(i.FECHA)}</td>
                </tr>
            `;
        }).join('');

        contenedorHistorial.innerHTML = `
            <table id="tablaHistorial" class="display" style="width:100%">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Categoría</th>
                        <th>Aciertos</th>
                        <th>Puntaje</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
            <div class="botones-accion">
                <button id="volverBtn" class="boton-secundario">Volver al inicio</button>
            </div>
        `;

        // Inicializar DataTables
        new DataTable('#tablaHistorial', {
            pageLength: 5,
            lengthMenu: [5, 10, 25, 50],
            order: [[0, 'desc']],
            language: {
                search: "🔍 Buscar:",
                lengthMenu: "Mostrar _MENU_ registros",
                info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
                infoEmpty: "Sin registros",
                infoFiltered: "(filtrado de _MAX_ totales)",
                zeroRecords: "No se encontraron resultados",
                emptyTable: "No hay datos disponibles",
                paginate: {
                    first: "Primero",
                    last: "Último",
                    next: "Siguiente",
                    previous: "Anterior"
                }
            },
            layout: {
                topStart: {
                    buttons: [
                        { extend: 'csv',   text: 'CSV' },
                        { extend: 'excel', text: 'Excel' },
                        { extend: 'pdf',   text: 'PDF' }
                    ]
                }
            }
        });

        contenedorHistorial.querySelector('#volverBtn').addEventListener('click', () => {
            contenedorHistorial.innerHTML = '';
            mostrarTemas();
        });

    } catch (error) {
        console.error('Error al cargar historial:', error);
        contenedorPregunta.innerHTML = '<h2 class="pregunta">Error</h2>';
        contenedorHistorial.innerHTML = `<p class="mensaje error">No se pudo cargar el historial.<br>${error.message}</p>`;
    }
}


// 8) Mostrar estadísticas del usuario

async function mostrarEstadisticas(idCategoriaFiltro = null) {
    contenedorPregunta.innerHTML = '<h2 class="pregunta">Cargando estadísticas...</h2>';
    contenedorOpciones.innerHTML = '';
    contenedorResultado.innerHTML = '';
    contenedorHistorial.innerHTML = '';

    const canvas = document.getElementById('grafico-progreso');
    if (canvas) canvas.style.display = 'none';

    try {
        // Traer categorías para el filtro
        const resCat = await fetch(`${API_URL}/api/categorias`);
        const dataCat = await resCat.json();

        const url = idCategoriaFiltro
            ? `${API_URL}/api/estadisticas/${USUARIO_ACTUAL_ID}?categoria=${idCategoriaFiltro}`
            : `${API_URL}/api/estadisticas/${USUARIO_ACTUAL_ID}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const r = data.resumen;

        contenedorPregunta.innerHTML = '<h2 class="pregunta">Mis estadísticas</h2>';

        // Selector de categoría
        const opcionesSelect = dataCat.categorias.map((c) =>
            `<option value="${c.ID_CATEGORIA}" ${idCategoriaFiltro === c.ID_CATEGORIA ? 'selected' : ''}>${c.NOMBRE}</option>`
        ).join('');

        const filtroHTML = `
            <div class="contenedor-filtro">
                <label for="filtroCategoria">Filtrar por categoría:</label>
                <select id="filtroCategoria">
                    <option value="">Todas</option>
                    ${opcionesSelect}
                </select>
            </div>
        `;

        if (Number(r.TOTAL_INTENTOS) === 0) {
            contenedorHistorial.innerHTML = `
                ${filtroHTML}
                <p class="mensaje">Aún no has jugado ningún quiz${idCategoriaFiltro ? ' en esta categoría' : ''}.</p>
            `;
        } else {
            const filasCategoria = data.por_categoria.map((c) => `
                <tr>
                    <td>${c.CATEGORIA}</td>
                    <td>${c.INTENTOS}</td>
                    <td>${c.PROMEDIO}%</td>
                    <td>${c.MEJOR}%</td>
                </tr>
            `).join('');

            contenedorHistorial.innerHTML = `
                ${filtroHTML}
                <div class="tarjetas-estadisticas">
                    <div class="tarjeta-stat">
                        <p class="stat-valor">${r.TOTAL_INTENTOS}</p>
                        <p class="stat-label">Intentos</p>
                    </div>
                    <div class="tarjeta-stat">
                        <p class="stat-valor">${r.PROMEDIO}%</p>
                        <p class="stat-label">Promedio</p>
                    </div>
                    <div class="tarjeta-stat">
                        <p class="stat-valor">${r.MEJOR_PUNTAJE}%</p>
                        <p class="stat-label">Mejor</p>
                    </div>
                    <div class="tarjeta-stat">
                        <p class="stat-valor">${r.PEOR_PUNTAJE}%</p>
                        <p class="stat-label">Peor</p>
                    </div>
                    <div class="tarjeta-stat">
                        <p class="stat-valor">${r.TOTAL_ACIERTOS}/${r.TOTAL_PREGUNTAS_JUGADAS}</p>
                        <p class="stat-label">Aciertos</p>
                    </div>
                </div>

                <table class="tabla-historial" style="margin-top: 24px;">
                    <thead>
                        <tr>
                            <th>Categoría</th>
                            <th>Intentos</th>
                            <th>Promedio</th>
                            <th>Mejor</th>
                        </tr>
                    </thead>
                    <tbody>${filasCategoria}</tbody>
                </table>
            `;
        }

        // Botón rvolve
        const divBotones = document.createElement('div');
        divBotones.className = 'botones-accion';
        divBotones.innerHTML = `<button id="volverBtn" class="boton-secundario">Volver al inicio</button>`;
        contenedorHistorial.appendChild(divBotones);

        // listener del filtro
        contenedorHistorial.querySelector('#filtroCategoria').addEventListener('change', (e) => {
        const raw = e.target.value;
        const val = raw === '' ? null : Number(raw);
        mostrarEstadisticas(val);
        });

        // Listener volver
        contenedorHistorial.querySelector('#volverBtn').addEventListener('click', () => {
            contenedorHistorial.innerHTML = '';
            mostrarTemas();
        });

        // Gráfico (si hay datos)
        //if (Number(r.TOTAL_INTENTOS) > 0) {
          //  await mostrarGraficoProgreso();
        //}

    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        contenedorPregunta.innerHTML = '<h2 class="pregunta">Error</h2>';
        contenedorHistorial.innerHTML = `<p class="mensaje error">No se pudieron cargar las estadísticas.<br>${error.message}</p>`;
    }
}

// 9) Ranking global - revisr contenedores
async function mostrarRanking() {
    contenedorPregunta.innerHTML = '<h2 class="pregunta">Cargando ranking...</h2>';
    contenedorOpciones.innerHTML = '';
    contenedorResultado.innerHTML = '';
    contenedorHistorial.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/api/ranking`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.total === 0) {
            contenedorPregunta.innerHTML = '<h2 class="pregunta">Ranking global</h2>';
            contenedorHistorial.innerHTML = '<p class="mensaje">Aún no hay partidas registradas.</p>';
            return;
        }

        contenedorPregunta.innerHTML = '<h2 class="pregunta">🏆 Ranking global — Top 10</h2>';

        const medallas = ['🥇', '🥈', '🥉'];
        const filas = data.ranking.map((r, idx) => {
            const posicion = idx < 3 ? medallas[idx] : (idx + 1);
            const clasePuntaje = r.PUNTAJE >= 70 ? 'puntaje-alto'
                              : r.PUNTAJE >= 40 ? 'puntaje-medio'
                              : 'puntaje-bajo';
            return `
                <tr>
                    <td>${posicion}</td>
                    <td>${r.USUARIO}</td>
                    <td>${r.CATEGORIA}</td>
                    <td>${r.RESPUESTAS_CORRECTAS}/${r.TOTAL_PREGUNTAS}</td>
                    <td class="${clasePuntaje}">${r.PUNTAJE}%</td>
                    <td>${fechaAmigable(r.FECHA)}</td>
                </tr>
            `;
        }).join('');

        contenedorHistorial.innerHTML = `
            <table class="tabla-historial">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Usuario</th>
                        <th>Categoría</th>
                        <th>Aciertos</th>
                        <th>Puntaje</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
            <div class="botones-accion">
                <button id="volverBtn" class="boton-secundario">Volver al inicio</button>
            </div>
        `;

        contenedorHistorial.querySelector('#volverBtn').addEventListener('click', () => {
            contenedorHistorial.innerHTML = '';
            mostrarTemas();
        });

    } catch (error) {
        console.error('Error al cargar ranking:', error);
        contenedorPregunta.innerHTML = '<h2 class="pregunta">Error</h2>';
        contenedorHistorial.innerHTML = `<p class="mensaje error">No se pudo cargar el ranking.<br>${error.message}</p>`;
    }
}

async function exportarHistorialCSV() {
    try {
        const res = await fetch(`${API_URL}/api/intentos/${USUARIO_ACTUAL_ID}?limit=100&offset=0`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.total === 0) {
            alert('No hay intentos para exportar.');
            return;
        }

        const cabecera = ['ID', 'Categoria', 'Aciertos', 'Total Preguntas', 'Puntaje', 'Fecha'];

        const filas = data.intentos.map((i) => [
            i.ID_INTENTO,
            `"${i.CATEGORIA}"`,
            i.RESPUESTAS_CORRECTAS,
            i.TOTAL_PREGUNTAS,
            i.PUNTAJE,
            `"${i.FECHA}"`
        ]);

        const csv = [cabecera.join(','), ...filas.map((f) => f.join(','))].join('\n');

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historial_${USUARIO_ACTUAL_ID}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error al exportar:', error);
        alert('No se pudo exportar: ' + error.message);
    }
}

async function mostrarGraficoProgreso() {
    const canvas = document.getElementById('grafico-progreso');
    if (!canvas) return;

    try {
        const res = await fetch(`${API_URL}/api/intentos/${USUARIO_ACTUAL_ID}?limit=100&offset=0`);
        const data = await res.json();

        if (data.total === 0) {
            canvas.style.display = 'none';
            return;
        }

        const intentos = [...data.intentos].reverse();
        const labels = intentos.map((i) => `#${i.ID_INTENTO}`);
        const puntajes = intentos.map((i) => i.PUNTAJE);

        canvas.style.display = 'block';

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Puntaje (%)',
                    data: puntajes,
                    borderColor: '#bdd72d',
                    backgroundColor: 'rgba(189, 215, 45, 0.2)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: '#bdd72d'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#c5bfbf' } },
                    title: {
                        display: true,
                        text: 'Evolución de tus puntajes',
                        color: '#bdd72d',
                        font: { size: 18 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: '#c5bfbf' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#c5bfbf' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error al cargar gráfico:', error);
        canvas.style.display = 'none';
    }
}

// Login y sesión
function verificarSesion() {
    const guardado = localStorage.getItem('usuario');
    const pantallaLogin = document.querySelector('#pantalla-login');

    if (guardado) {
    try {
        const usuario = JSON.parse(guardado);

        // ⬇️ Verificar expiración
        if (usuario.expira && Date.now() > usuario.expira) {
            localStorage.removeItem('usuario');
            throw new Error('Sesión expirada');
        }
        USUARIO_ACTUAL_ID = usuario.id_usuario;

            const nombreEl = document.querySelector('#nombreUsuario');
            const badge = usuario.rol === 'ADMIN'
            ? '<span class="badge badge-admin">🛡️ ADMIN</span>'
            : '<span class="badge badge-user">🎮 USUARIO</span>';
            nombreEl.innerHTML = `${usuario.nombre} ${badge}`;
            document.querySelector('#perfilBtn').addEventListener('click', mostrarPerfil);
            document.querySelector('#logoutBtn').addEventListener('click', cerrarSesion);

            pantallaLogin.style.display = 'none';
            contenedorUsuario.style.display = 'flex';

            mostrarTemas();
            return;
        } catch (e) {
            localStorage.removeItem('usuario');
        }
    }

    // No hay sesión _ mostrar login
    pantallaLogin.style.display = 'block';
    contenedorUsuario.style.display = 'none';

    document.querySelector('#formLogin').addEventListener('submit', manejarLogin);
    // Toggle login ↔ registro
    document.querySelector('#mostrarRegistro').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('#pantalla-login').style.display = 'none';
    document.querySelector('#pantalla-registro').style.display = 'block';
    });

    document.querySelector('#mostrarLogin').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('#pantalla-registro').style.display = 'none';
    document.querySelector('#pantalla-login').style.display = 'block';
    });

document.querySelector('#formRegistro').addEventListener('submit', manejarRegistro);
}

async function manejarLogin(e) {
    e.preventDefault();

    const correo = document.querySelector('#loginCorreo').value.trim();
    const password = document.querySelector('#loginPassword').value;
    const elError = document.querySelector('#loginError');

    elError.style.display = 'none';

    try {
        const res = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.mensaje || `HTTP ${res.status}`);

        localStorage.setItem('usuario', JSON.stringify({
        ...data.usuario,
        expira: Date.now() + (30 * 60 * 1000)
         }));       
        verificarSesion();

    } catch (error) {
        console.error('Error de login:', error);
        elError.textContent = error.message;
        elError.style.display = 'block';
    }
}

function cerrarSesion() {
    localStorage.removeItem('usuario');
    USUARIO_ACTUAL_ID = null;
    location.reload();
}

// Revisar act
// Panel de administrador
function mostrarPanelAdmin() {
    contenedorPregunta.innerHTML = '<h2 class="pregunta">🛡️ Panel Admin</h2>';
    contenedorOpciones.innerHTML = '';
    contenedorResultado.innerHTML = '';
    contenedorHistorial.innerHTML = '';

    contenedorHistorial.innerHTML = `
        <div class="botones-accion" style="justify-content: flex-start; margin-bottom: 24px;">
            <button id="verUsuariosBtn" class="boton-secundario">👥 Ver todos los usuarios</button>
            <button id="verTodosIntentosBtn" class="boton-secundario">📋 Ver todos los intentos</button>
            <button id="verLogsBtn" class="boton-secundario">📋 Logs de auditoría</button>
            <button id="volverBtn" class="boton-secundario">Volver al inicio</button>
        </div>
        <div id="adminContenido"></div>
    `;

    contenedorHistorial.querySelector('#volverBtn').addEventListener('click', () => {
        contenedorHistorial.innerHTML = '';
        mostrarTemas();
    });
    
    // list
    contenedorHistorial.querySelector('#verLogsBtn').addEventListener('click', mostrarTablaLogsAdmin);
    contenedorHistorial.querySelector('#verUsuariosBtn').addEventListener('click', mostrarTablaUsuariosAdmin);
    contenedorHistorial.querySelector('#verLogsBtn').addEventListener('click', mostrarTablaLogsAdmin);  // revO

    contenedorHistorial.querySelector('#verTodosIntentosBtn').addEventListener('click', mostrarTablaIntentosAdmin);

}

async function mostrarTablaUsuariosAdmin() {
    const cont = document.querySelector('#adminContenido');
    cont.innerHTML = '<p class="mensaje">Cargando usuarios...</p>';

    try {
        const res = await fetch(`${API_URL}/api/usuarios`);
        const data = await res.json();

        const filas = data.usuarios.map((u) => `
            <tr>
                <td>${u.ID_USUARIO}</td>
                <td>${u.NOMBRE}</td>
                <td>${u.CORREO}</td>
                <td>${u.ROL}</td>
                <td>${fechaAmigable(u.FECHA_REGISTRO)}</td>
            </tr>
        `).join('');

        cont.innerHTML = `
            <input type="text" id="buscarUsuario" placeholder="🔍 Buscar usuario..." 
                   style="width:100%; padding:8px; margin-bottom:12px; background:var(--color-fondo); 
                          color:var(--color-opcion); border:2px solid var(--color-pregunta); border-radius:4px;">
            <table class="tabla-historial">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Rol</th>
                        <th>Registro</th>
                    </tr>
                </thead>
                <tbody id="tablaUsuariosBody">${filas}</tbody>
            </table>
        `;

        // Búsqueda en tiempo real
        document.querySelector('#buscarUsuario').addEventListener('input', (e) => {
            const texto = e.target.value.toLowerCase();
            const filasTabla = document.querySelectorAll('#tablaUsuariosBody tr');
            filasTabla.forEach((fila) => {
                const visible = fila.textContent.toLowerCase().includes(texto);
                fila.style.display = visible ? '' : 'none';
            });
        });

    } catch (error) {
        cont.innerHTML = `<p class="mensaje error">Error: ${error.message}</p>`;
    }
}

async function mostrarTablaIntentosAdmin() {
    const cont = document.querySelector('#adminContenido');
    cont.innerHTML = '<p class="mensaje">Cargando intentos...</p>';

    try {
        const res = await fetch(`${API_URL}/api/intentos`);
        const data = await res.json();

        if (data.total === 0) {
            cont.innerHTML = '<p class="mensaje">No hay intentos registrados.</p>';
            return;
        }

        const filas = data.intentos.map((i) => `
            <tr>
                <td>${i.ID_INTENTO}</td>
                <td>${i.USUARIO}</td>
                <td>${i.CATEGORIA}</td>
                <td>${i.RESPUESTAS_CORRECTAS}/${i.TOTAL_PREGUNTAS}</td>
                <td>${i.PUNTAJE}%</td>
                <td>${fechaAmigable(i.FECHA)}</td>
            </tr>
        `).join('');

        cont.innerHTML = `
            <p class="mensaje" style="text-align:left;">Total: ${data.total} intentos</p>
            <table class="tabla-historial">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Usuario</th>
                        <th>Categoría</th>
                        <th>Aciertos</th>
                        <th>Puntaje</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        `;
    } catch (error) {
        cont.innerHTML = `<p class="mensaje error">Error: ${error.message}</p>`;
    }
}

// agregados
// Perfil del usuario
async function mostrarPerfil() {
    contenedorPregunta.innerHTML = '<h2 class="pregunta">👤 Mi perfil</h2>';
    contenedorOpciones.innerHTML = '';
    contenedorResultado.innerHTML = '';
    contenedorHistorial.innerHTML = '<p class="mensaje">Cargando...</p>';

    try {
        const res = await fetch(`${API_URL}/api/usuarios/${USUARIO_ACTUAL_ID}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const u = data.usuario;

        contenedorHistorial.innerHTML = `
            <div class="tarjetas-estadisticas">
                <div class="tarjeta-stat">
                    <p class="stat-valor">${u.NOMBRE}</p>
                    <p class="stat-label">Nombre</p>
                </div>
                <div class="tarjeta-stat">
                    <p class="stat-valor" style="font-size:1.2rem;">${u.CORREO}</p>
                    <p class="stat-label">Correo</p>
                </div>
                <div class="tarjeta-stat">
                    <p class="stat-valor" style="font-size:1.3rem;">${u.ROL}</p>
                    <p class="stat-label">Rol</p>
                </div>
                <div class="tarjeta-stat">
                    <p class="stat-valor" style="font-size:1.1rem;">${fechaAmigable(u.FECHA_REGISTRO)}</p>
                    <p class="stat-label">Registro</p>
                </div>
            </div>
            <div class="botones-accion">
                <button id="volverBtn" class="boton-secundario">Volver al inicio</button>
            </div>
        `;

        contenedorHistorial.querySelector('#volverBtn').addEventListener('click', () => {
            contenedorHistorial.innerHTML = '';
            mostrarTemas();
        });

    } catch (error) {
        contenedorHistorial.innerHTML = `<p class="mensaje error">Error: ${error.message}</p>`;
    }
}

//revisar bcrypt
// Registro de usuario
async function manejarRegistro(e) {
    e.preventDefault();

    const nombre = document.querySelector('#regNombre').value.trim();
    const correo = document.querySelector('#regCorreo').value.trim();
    const password = document.querySelector('#regPassword').value;
    const elError = document.querySelector('#registroError');

    elError.style.display = 'none';

    try {
        const res = await fetch(`${API_URL}/api/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, correo, password })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.mensaje || `HTTP ${res.status}`);

        // Registro exitoso → login automático
        localStorage.setItem('usuario', JSON.stringify({
            ...data.usuario,
            expira: Date.now() + (30 * 60 * 1000)
        }));

        verificarSesion();

    } catch (error) {
        console.error('Error de registro:', error);
        elError.textContent = error.message;
        elError.style.display = 'block';
    }
}

async function mostrarTablaLogsAdmin() {
    const cont = document.querySelector('#adminContenido');
    cont.innerHTML = '<p class="mensaje">Cargando logs...</p>';

    try {
        const res = await fetch(`${API_URL}/api/logs`);
        const data = await res.json();

        if (data.total === 0) {
            cont.innerHTML = '<p class="mensaje">No hay logs registrados.</p>';
            return;
        }

        const filas = data.logs.map((l) => `
            <tr>
                <td>${l.ID_LOG}</td>
                <td>${l.USUARIO || '—'}</td>
                <td>${l.ACCION}</td>
                <td>${l.DETALLE}</td>
                <td>${fechaAmigable(l.FECHA)}</td>
            </tr>
        `).join('');

        cont.innerHTML = `
            <p class="mensaje" style="text-align:left;">Total: ${data.total} logs</p>
            <table class="tabla-historial">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Usuario</th>
                        <th>Acción</th>
                        <th>Detalle</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        `;
    } catch (error) {
        cont.innerHTML = `<p class="mensaje error">Error: ${error.message}</p>`;
    }
}