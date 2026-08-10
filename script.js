const DAY_CONFIG = {
  monday: {
    label: "Monday — City Construction",
    startDay: "Sunday",
    startMinutes: 23 * 60 + 45,
    slots: 49,
    rolloverIndex: 48
  },
  tuesday: {
    label: "Tuesday — Basic Skills",
    startDay: "Monday",
    startMinutes: 23 * 60 + 45,
    slots: 49,
    rolloverIndex: 0
  },
  thursday: {
    label: "Thursday — Hero Development",
    startDay: "Wednesday",
    startMinutes: 23 * 60 + 45,
    slots: 49,
    rolloverIndex: 0
  }
};

const STORAGE_KEY = "kingshot-kvk-planner-bookings-v1";

let currentDay = "monday";
let selectedSlotKey = null;

const slotsEl = document.getElementById("slots");
const summaryEl = document.getElementById("slotSummary");
const countEl = document.getElementById("confirmedCount");
const carryoverNote = document.getElementById("carryoverNote");

const dialog = document.getElementById("bookingDialog");
const bookingForm = document.getElementById("bookingForm");
const dialogSlot = document.getElementById("dialogSlot");
const playerName = document.getElementById("playerName");
const allianceName = document.getElementById("allianceName");
const deleteBooking = document.getElementById("deleteBooking");
const cancelBooking = document.getElementById("cancelBooking");

function getBookings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function addMinutes(dayName, minutes, add) {
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  let dayIndex = days.indexOf(dayName);
  let total = minutes + add;
  while (total >= 1440) {
    total -= 1440;
    dayIndex = (dayIndex + 1) % 7;
  }
  while (total < 0) {
    total += 1440;
    dayIndex = (dayIndex + 6) % 7;
  }
  return {
    day: days[dayIndex],
    minutes: total,
    time: `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
  };
}

function slotInfo(day, index) {
  const cfg = DAY_CONFIG[day];
  const start = addMinutes(cfg.startDay, cfg.startMinutes, index * 30);
  const end = addMinutes(cfg.startDay, cfg.startMinutes, index * 30 + 30);

  let key = `${day}-${index}`;

  // Monday's final 23:45 → Tuesday 00:15 booking is THE SAME
  // booking shown as Tuesday's first slot.
  if ((day === "monday" && index === 48) || (day === "tuesday" && index === 0)) {
    key = "monday-tuesday-crossover";
  }

  return {
    key,
    start,
    end,
    crossesDay: start.day !== end.day,
    display: `${start.time}–${end.time}`,
    fullDisplay: start.day === end.day
      ? `${start.day} ${start.time}–${end.time}`
      : `${start.day} ${start.time} → ${end.day} ${end.time}`
  };
}

function render() {
  const bookings = getBookings();
  const cfg = DAY_CONFIG[currentDay];
  slotsEl.innerHTML = "";

  let booked = 0;

  for (let i = 0; i < cfg.slots; i++) {
    const info = slotInfo(currentDay, i);
    const booking = bookings[info.key];
    if (booking) booked++;

    const row = document.createElement("div");
    row.className = "slot" + (!booking ? " empty" : "") + (info.crossesDay ? " cross-day" : "");
    row.dataset.slotKey = info.key;
    row.dataset.index = i;

    const time = document.createElement("div");
    time.className = "slot-time";
    time.textContent = info.display;

    const person = document.createElement("div");
    person.className = "player";

    if (booking) {
      const alliance = document.createElement("span");
      alliance.className = "alliance";
      alliance.textContent = booking.alliance || "—";

      const name = document.createElement("span");
      name.className = "player-name";
      name.textContent = booking.player;

      person.append(alliance, name);
    } else {
      const empty = document.createElement("span");
      empty.className = "empty-text";
      empty.textContent = "Available — click to book";
      person.append(empty);
    }

    const status = document.createElement("div");
    status.className = "status";
    status.textContent = booking ? "✓" : "+";

    row.append(time, person, status);
    row.addEventListener("click", () => openDialog(info));

    slotsEl.appendChild(row);
  }

  summaryEl.textContent = `${booked}/${cfg.slots} slots booked`;
  countEl.textContent = `${booked} booked`;
  carryoverNote.hidden = currentDay !== "tuesday";
}

function openDialog(info) {
  selectedSlotKey = info.key;
  const bookings = getBookings();
  const booking = bookings[info.key];

  dialogSlot.textContent = info.fullDisplay;
  playerName.value = booking?.player || "";
  allianceName.value = booking?.alliance || "CRN";
  deleteBooking.hidden = !booking;

  dialog.showModal();
  setTimeout(() => playerName.focus(), 20);
}

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedSlotKey) return;

  const player = playerName.value.trim();
  const alliance = allianceName.value.trim().toUpperCase();

  if (!player) return;

  const bookings = getBookings();
  bookings[selectedSlotKey] = { player, alliance };
  saveBookings(bookings);

  dialog.close();
  render();
});

deleteBooking.addEventListener("click", () => {
  if (!selectedSlotKey) return;
  const bookings = getBookings();
  delete bookings[selectedSlotKey];
  saveBookings(bookings);
  dialog.close();
  render();
});

cancelBooking.addEventListener("click", () => dialog.close());

document.querySelectorAll(".day-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".day-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentDay = btn.dataset.day;
    render();
  });
});

const pointsToggle = document.getElementById("pointsToggle");
const pointsContent = document.getElementById("pointsContent");
const pointsArrow = document.getElementById("pointsArrow");

pointsToggle.addEventListener("click", () => {
  const hidden = pointsContent.hidden;
  pointsContent.hidden = !hidden;
  pointsArrow.textContent = hidden ? "⌄" : "›";
});

render();
