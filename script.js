let chart;
let subs = []; 

document.addEventListener("DOMContentLoaded", () => {
  loadExpensesFromServer();
});

async function loadExpensesFromServer() {
  try {
    const response = await fetch('/ExpenseFlow/api/expenses');
    if (!response.ok) throw new Error('Database fetch failed');
    
    subs = await response.json(); 
    renderAll();                  
  } catch (error) {
    console.error("Error retrieving records from MySQL:", error);
  }
}

async function saveSub() {
  const name = document.getElementById("name");
  const price = document.getElementById("price");
  const date = document.getElementById("date");

  if (!name.value || !price.value || !date.value) return;

 
  const formData = new URLSearchParams({
    name: name.value.trim(),
    price: Number(price.value),
    date: date.value
  });

  try {
    const response = await fetch('/ExpenseFlow/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });

    if (response.ok) {
      name.value = "";
      price.value = "";
      date.value = "";
      loadExpensesFromServer(); 
    } else {
      alert("Server error while saving!");
    }
  } catch (error) {
    console.error("Network error during save operation:", error);
  }
}

async function deleteSub(id) {
  const formData = new URLSearchParams({
    action: 'delete',
    id: id
  });

  try {
    const response = await fetch('/ExpenseFlow/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });

    if (response.ok) {
      loadExpensesFromServer(); 
    } else {
      alert("Failed to delete entry from server database.");
    }
  } catch (error) {
    console.error("Network error during delete operation:", error);
  }
}

function renderAll() {
  updateTotal();
  updateMonthlyTotal();
  updateYearlyTotal();
  renderMonthlyBreakdown();
  renderChart();
}

function updateTotal() {
  const el = document.getElementById("total");
  if (!el) return;
  const total = subs.reduce((sum, s) => sum + (s.price ? Number(s.price) : 0), 0);
  el.innerText = total;
}

function updateMonthlyTotal() {
  const el = document.getElementById("monthTotal");
  if (!el) return;
  const now = new Date();
  const total = subs.reduce((sum, s) => {
    if (!s.date) return sum;
    const d = new Date(s.date);
    if (isNaN(d)) return sum;
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      return sum + (s.price ? Number(s.price) : 0);
    }
    return sum;
  }, 0);
  el.innerText = total;
}

function updateYearlyTotal() {
  const el = document.getElementById("yearTotal");
  if (!el) return;
  const currentYear = new Date().getFullYear();
  const total = subs.reduce((sum, s) => {
    if (!s.date) return sum;
    const d = new Date(s.date);
    if (isNaN(d.getTime())) return sum;
    if (d.getFullYear() === currentYear) {
      return sum + (s.price ? Number(s.price) : 0);
    }
    return sum;
  }, 0);
  el.innerText = total;
}

function renderMonthlyBreakdown() {
  const container = document.getElementById("monthlyList");
  if (!container) return;
  container.innerHTML = "";
  const groups = {};

  subs.forEach(s => {
    if (!s.date) return;
    const d = new Date(s.date);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!groups[key]) {
      groups[key] = {
        items: [],
        total: 0,
        time: new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      };
    }
    groups[key].items.push(s);
    groups[key].total += s.price ? Number(s.price) : 0;
  });

  Object.keys(groups)
    .sort((a, b) => groups[b].time - groups[a].time)
    .forEach(key => {
      const group = groups[key];
      const [y, m] = key.split("-");
      const date = new Date(Number(y), Number(m));

      const html = group.items
        .map(item => `
          <div class="month-item">
            <span>${item.name} - ₹${item.price}</span>
            <button onclick="deleteSub(${item.id})">Delete</button>
          </div>
        `)
        .join("");

      const div = document.createElement("div");
      div.className = "month-box";
      div.innerHTML = `
        <h3>${date.toLocaleString("en-IN", { month: "long", year: "numeric" })}</h3>
        ${html}
        <b>Total: ₹${group.total}</b>
      `;
      container.appendChild(div);
    });
}

function renderChart() {
  const canvas = document.getElementById("chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (chart) chart.destroy();
  if (subs.length === 0) return;

  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: subs.map(s => s.name),
      datasets: [{
        data: subs.map(s => s.price ? Number(s.price) : 0)
      }]
    }
  });
}