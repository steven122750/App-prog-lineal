/**
 * 
 * Author: Steven Cardona Pérez
 */


// Función para agregar una nueva restricción al formulario
function addConstraint() {
    const div = document.createElement("div");
    div.classList.add("input-group", "mb-2");
    div.innerHTML = `
        <input type="number" class="form-control coef-x1" placeholder="Coef. X1">
        <span class="input-group-text">X1 +</span>
        <input type="number" class="form-control coef-x2" placeholder="Coef. X2">
        <span class="input-group-text">X2</span>
        <select class="form-select operador">
            <option value="<=">≤</option>
            <option value=">=">≥</option>
        </select>
        <input type="number" class="form-control limite" placeholder="Valor">
        <button class="btn btn-danger" onclick="this.parentElement.remove()">❌</button>
    `;
    document.getElementById("constraints").appendChild(div);
}


let chartInstance = null; // Variable para la gráfica

// Función principal
function solve() {
    // Obtiene el tipo de optimización (maximizar o minimizar)
    const objectiveType = document.getElementById("objective").value;

    // Obtiene los coeficientes de la función objetivo
    const coefX1 = parseFloat(document.getElementById("coef_x1").value) || 0;
    const coefX2 = parseFloat(document.getElementById("coef_x2").value) || 0;

    let constraints = []; // Almacena las restricciones ingresadas

    // Recorre todas las restricciones agregadas en el formulario
    document.querySelectorAll("#constraints .input-group").forEach(row => {
        constraints.push({
            coefX1: parseFloat(row.querySelector(".coef-x1").value) || 0,
            coefX2: parseFloat(row.querySelector(".coef-x2").value) || 0,
            operador: row.querySelector(".operador").value,
            limite: parseFloat(row.querySelector(".limite").value) || 0
        });
    });

    // Encuentra los vértices de la región factible
    let vertices = findFeasibleRegion(constraints);

    let bestValue = objectiveType === "max" ? -Infinity : Infinity;
    let bestPoint = null;
    let calculations = [];


    // Evalúa la función objetivo en cada vértice encontrado
    vertices.forEach(([x1, x2], index) => {
        let value = coefX1 * x1 + coefX2 * x2;
        calculations.push({ index: index + 1, X1: x1, X2: x2, Z: value });

        if ((objectiveType === "max" && value > bestValue) ||
            (objectiveType === "min" && value < bestValue)) {
            bestValue = value;
            bestPoint = { X1: x1, X2: x2 };
        }
    });

    // Muestra el resultado en pantalla y genera la gráfica
    if (bestPoint) {
        document.getElementById("result").innerText =
            `Óptimo: Z = ${bestValue}, X1 = ${bestPoint.X1}, X2 = ${bestPoint.X2}`;
        drawGraph(vertices, bestPoint, constraints);
        generateSolutionTables(vertices, calculations);
    } else {
        document.getElementById("result").innerText = "No hay solución factible.";
        document.getElementById("solution-table").innerHTML = "";
    }
}

// Función para encontrar la región factible a partir de las restricciones
function findFeasibleRegion(constraints) {
    let vertices = [];
    // Calcula la intersección de cada par de restricciones
    for (let i = 0; i < constraints.length; i++) {
        for (let j = i + 1; j < constraints.length; j++) {
            let A1 = constraints[i].coefX1, B1 = constraints[i].coefX2, C1 = constraints[i].limite;
            let A2 = constraints[j].coefX1, B2 = constraints[j].coefX2, C2 = constraints[j].limite;

            let det = A1 * B2 - A2 * B1;
            if (det !== 0) {
                let x1 = (C1 * B2 - C2 * B1) / det;
                let x2 = (A1 * C2 - A2 * C1) / det;
                if (isFeasible(x1, x2, constraints)) {
                    vertices.push([x1, x2]);
                }
            }
        }
    }
    return vertices;
}

// Función para verificar si un punto está dentro de la región factible
function isFeasible(x1, x2, constraints) {
    return constraints.every(({ coefX1, coefX2, operador, limite }) => {
        let lhs = coefX1 * x1 + coefX2 * x2;
        return operador === "<=" ? lhs <= limite : lhs >= limite;
    });
}


// Función para dibujar la gráfica de la solución
function drawGraph(vertices, bestPoint, constraints) {
    const ctx = document.getElementById("chart").getContext("2d");


    // Elimina la gráfica anterior si existe
    if (chartInstance) {
        chartInstance.destroy();
    }

    let datasets = constraints.map(({ coefX1, coefX2, limite }, index) => {
        let x1Min = 0, x1Max = Math.max(...vertices.map(v => v[0])) + 10;
        let y1Min = (limite - coefX1 * x1Min) / coefX2;
        let y1Max = (limite - coefX1 * x1Max) / coefX2;

        return {
            label: `Restricción ${index + 1}`,
            data: [
                { x: x1Min, y: y1Min },
                { x: x1Max, y: y1Max }
            ],
            borderColor: `hsl(${index * 60}, 70%, 50%)`,
            borderWidth: 2,
            fill: false,
            showLine: true
        };
    });

    // Dibuja la región factible si hay vértices
    if (vertices.length > 0) {
        datasets.push({
            label: "Región Factible",
            data: vertices.map(([x1, x2]) => ({ x: x1, y: x2 })),
            backgroundColor: "rgba(0, 0, 255, 0.3)",
            borderColor: "blue",
            borderWidth: 1.5,
            pointRadius: 3,
            fill: true, // Sombrea la región factible
            type: "line",
        });
    }

    // Marca el punto óptimo en la gráfica
    datasets.push({
        label: "Solución Óptima",
        data: [{ x: bestPoint.X1, y: bestPoint.X2 }],
        backgroundColor: "red",
        pointRadius: 7
    });

    // Genera la gráfica con Chart.js
    chartInstance = new Chart(ctx, {
        type: "scatter",
        data: { datasets },
        options: {
            scales: {
                x: { beginAtZero: true },
                y: { beginAtZero: true }
            }
        }
    });
}

// Función para generar las tablas de solución en HTML
function generateSolutionTables(vertices, calculations) {
    let tableHtml = `<h3>Puntos Factibles</h3><table border="1" style="width:100%; text-align:center; border-collapse: collapse;">
        <tr><th>#</th><th>X1</th><th>X2</th></tr>`;
    vertices.forEach(([x1, x2], index) => {
        tableHtml += `<tr><td>${index + 1}</td><td>${x1.toFixed(2)}</td><td>${x2.toFixed(2)}</td></tr>`;
    });
    tableHtml += `</table>`;

    tableHtml += `<h3>Evaluación de Z</h3><table border="1" style="width:100%; text-align:center; border-collapse: collapse;">
        <tr><th>#</th><th>X1</th><th>X2</th><th>Z</th></tr>`;
    calculations.forEach(({ index, X1, X2, Z }) => {
        tableHtml += `<tr><td>${index}</td><td>${X1.toFixed(2)}</td><td>${X2.toFixed(2)}</td><td>${Z.toFixed(2)}</td></tr>`;
    });
    tableHtml += `</table>`;

    document.getElementById("solution-table").innerHTML = tableHtml;
}
