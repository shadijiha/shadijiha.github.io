/**
 *
 */

const table = document.getElementById("my_table");

const elementsBuffer = [new Set(), new Set(), new Set()];

function generateTableRows() {
    for (let i = 0; i < 3; i++) {
        const tr = document.createElement("tr");

        const td = document.createElement("td");
        const div = document.createElement("div");
        const select = generateSelect();

        // Crit td
        const critTd = document.createElement("td");
        const weaknessTd = document.createElement("td");

        select.onchange = (e) => {
            elementsBuffer[i].add(e.target.value);
            updateDiv(div, i);

            // Update crit
            elementsToImage(critTd, getCritiable(elementsBuffer[i]));

            // Update weakness
            const defending = getDefensiveElement(elementsBuffer[i]);
            const weakness = getWeakness(defending);
            console.log(defending);
            elementsToImage(weaknessTd, weakness);

            // Update total weakness and crits
            updateTotalCrit();
            updateTotalWeakness();
            cache();
        };
        select.onchange({ target: select });

        const clear = document.createElement("button");
        clear.innerHTML = "clear";
        clear.onclick = () => {
            elementsBuffer[i] = new Set();
            updateDiv(div, i);
            critTd.innerHTML = "";
            weaknessTd.innerHTML = "";

            updateTotalCrit();
            updateTotalWeakness();
            cache();
        };

        td.appendChild(div);
        td.appendChild(select);
        td.appendChild(clear);

        tr.appendChild(td);
        tr.appendChild(critTd);
        tr.appendChild(weaknessTd);

        table.appendChild(tr);
    }

    function updateDiv(div, index) {
        div.innerHTML = "";
        elementsToImage(div, elementsBuffer[index]);
    }

    function elementsToImage(dom, elements, clearDom = true) {
        if (clearDom) dom.innerHTML = "";
        for (const e of elements) {
            if (!e) continue;

            if (e == "time")
                dom.innerHTML += `<img src="https://www.ditlep.com/Content/Images/DragonType/ic-time-flag.png" title="time" alt="time" />`;
            else
                dom.innerHTML += `<img src="https://deetlist.com/dragoncity/img/types/${e}.png" alt="${e}" title="${e}" />`;
        }
    }

    function updateTotalCrit() {
        const critImageDiv = document.getElementById("crit_image");
        critImageDiv.innerHTML = "";

        const total = new Set();
        elementsBuffer.forEach((set) => {
            const crits = getCritiable(set);
            for (const e of crits) total.add(e);
        });
        elementsToImage(critImageDiv, total);

        document.getElementById("total_crit").innerHTML =
            total.size + " / " + elements.length;

        // Update missing
        const missing = new Set();
        for (const e of elements) {
            if (!total.has(e.name)) missing.add(e.name);
        }
        elementsToImage(document.getElementById("missing_crit"), missing);
    }

    function updateTotalWeakness() {
        const critImageDiv = document.getElementById("weakness_image");
        critImageDiv.innerHTML = "";

        const total = new Set();
        elementsBuffer.forEach((set) => {
            const defending = getDefensiveElement(set);
            const weakness = getWeakness(defending);

            for (const e of weakness) total.add(e);
        });
        elementsToImage(critImageDiv, total);

        document.getElementById("total_weakness").innerHTML =
            total.size + " / " + elements.length;
    }

    function getDefensiveElement(set) {
        for (const e of set.values())
            if (e) return e;
        return "";
    }
}
load();
generateTableRows();

function generateSelect() {
    const select = document.createElement("select");

    select.appendChild(document.createElement("option"));
    for (const element of elements) {
        const option = document.createElement("option");
        option.setAttribute("value", element.name);
        option.innerText = element.name;
        select.appendChild(option);
    }

    return select;
}

/**
 *
 * Caching for reloading
 */
function cache() {
    const buffer = [];

    for (const set of elementsBuffer) {
        const tempArray = [];
        for (const e of set.values()) tempArray.push(e);
        buffer.push(tempArray);
    }
    localStorage.setItem("elementsBuffer", JSON.stringify(buffer));
    localStorage.getItem("elementsBuffer");
}

function load() {
    const buffer = JSON.parse(localStorage.getItem("elementsBuffer") || []);
    for (let i = 0; i < buffer.length; i++) {
        for (const e of buffer[i]) {
            elementsBuffer[i].add(e);
        }
    }
}