/**
 * Build a calendar
 *
 * @param {Record<number, string>} data
 * @param {{
 *   year?: number,
 *   month?: number,
 *   title?: string,
 *   dataStartDate?: string,
 *   dataEndDate?: string,
 *   dataProcessor?: (e: string) => string
 * }} options
 */
function buildCalendar(data, options = {}) {

  const {
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
    title = "Bijouterie Hamel",
    dataStartDate = "",
    dataEndDate = "",
    dataProcessor = (e) => e
  } = options;


  const daysOfWeek = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi"
  ];


  const monthNames = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre"
  ];


  const startDay = Number(Object.keys(data)[0]);
  const firstDay = new Date(
      year,
      month - 1,
      startDay
  ).getDay();


  const daysInMonth = new Date(
    year,
    month,
    0
  ).getDate();


  const daysInPreviousMonth = new Date(
    year,
    month - 1,
    0
  ).getDate();


  let html = `
    <div class="calendar-month">

      <section class="calendar-month-header">

        <div id="selected-month">

          ${title}

          <p>
          ${monthNames[month - 1]} ${year}
          </p>

          </div>

          </section>


          <div class="no_print calendar-settings">

          <label>
          Début des données:
          <input 
              type="date" 
              value="${dataStartDate}"
          >
          </label>


          <label>
          Fin des données:
          <input 
              type="date"
              value="${dataEndDate}"
          >
          </label>

          </div>



          <ol class="day-of-week">

          ${daysOfWeek.map(day => `
          <li>${day}</li>
          `).join("")}

          </ol>


          <ol class="days-grid">

    `;



  // Previous month empty cells
  for (let i = 0; i < firstDay; i++) {

    const day =
      daysInPreviousMonth - firstDay + i + 1;


    html += `<li class="calendar-day other-month">
              <span>
              ${day}
              </span>

              <p class="content" contenteditable></p>

            </li>`;
  }



  // Current month
  for (let day = startDay; day <= daysInMonth; day++) {

    html += `

<li class="calendar-day">

<span>
${day}
</span>


<p class="content" contenteditable>
${data[day] ? dataProcessor(data[day]) : ""}
</p>

</li>

`;

  }



  // Next month padding
  const totalCells = firstDay + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;


  for (let i = 1; i <= remaining; i++) {

    html += `

<li class="calendar-day other-month">

<span>
${i}
</span>

<p class="content" contenteditable></p>

</li>

`;

  }



  html += `

</ol>

</div>

`;



  const app = document.getElementById("app");
  app.innerHTML = html;

}

function main() {

  const data = {
    12: "Fermé", 13: "9:30 à 17:00", 14: "9:30 à 18:00",
    15: "9:30 à 19:00", 16: "9:30 à 19:00", 17: "9:30 à 16:00", 18: "11:00 à 16:00",
    19: "9:30 à 18:00", 20: "9:30 à 18:00", 21: "9:30 à 18:00", 22: "9:30 à 19:00",
    23: "9:30 à 19:00", 24: "9:30 à 16:00", 25: "Fermé", 26: "Fermé", 27: "Fermé",
    28: "9:30 à 17:30", 29: "9:30 à 19:00", 30: "9:30 à 19:00", 31: "9:30 à 16:00",
  };


  buildCalendar(data, {
    year: new Date().getFullYear(),

    month: 12,

    title: "Bijouterie Hamel",

    dataStartDate: "2026-12-12",

    dataEndDate: "2027-01-02",

    dataProcessor: e =>
      e.replace(" ", "<br>")

  });

}


main();
