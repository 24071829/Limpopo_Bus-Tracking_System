const express = require("express");
const app = express();

app.use(express.json());

// ================= DATA =================
let buses = [
  { id: 1, name: "UNIVEN Bus", latitude: -22.976, longitude: 30.446, status: "Running" },
  { id: 2, name: "Thohoyandou Bus", latitude: -22.980, longitude: 30.450, status: "Running" }
];

let admin = { username: "admin", password: "1234" };

// ================= HOME =================
app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <style>
      body { font-family: Arial; margin:0; }
      .hero {
        background:black;
        color:white;
        padding:40px;
        text-align:center;
      }
      .btn {
        padding:15px;
        margin:10px;
        border:none;
        background:#000;
        color:#fff;
        width:200px;
        cursor:pointer;
      }
    </style>
  </head>
  <body>
    <div class="hero">
      <h1>🚍 Limpopo Smart Transport</h1>
      <p>Uber-Style Bus Tracking System</p>
      <a href="/map"><button class="btn">Track Buses</button></a>
      <a href="/login"><button class="btn">Admin Panel</button></a>
    </div>
  </body>
  </html>
  `);
});

// ================= MAP =================
app.get("/map", (req, res) => {
  res.send(`
  <html>
  <head>
    <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY"></script>
    <style>
      body { margin:0; font-family: Arial; }
      #map { height:100vh; }

      .panel {
        position:absolute;
        top:20px;
        left:20px;
        background:white;
        padding:15px;
        border-radius:10px;
        box-shadow:0 0 10px rgba(0,0,0,0.3);
      }
    </style>
  </head>

  <body>
    <div id="map"></div>

    <div class="panel">
      <h3>Nearby Buses</h3>
      <div id="list"></div>
    </div>

    <script>
      let map;
      let markers = [];

      function initMap() {
        map = new google.maps.Map(document.getElementById("map"), {
          zoom: 14,
          center: { lat: -22.976, lng: 30.446 },
          styles: [{ stylers: [{ saturation: -100 }] }]
        });

        load();
        setInterval(load, 3000);
      }

      function load() {
        fetch('/api/buses')
        .then(res => res.json())
        .then(data => {

          markers.forEach(m => m.setMap(null));
          markers = [];

          list.innerHTML = "";

          data.forEach(bus => {
            let marker = new google.maps.Marker({
              position: { lat: bus.latitude, lng: bus.longitude },
              map: map,
              icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
            });

            markers.push(marker);

            list.innerHTML += "<p>🚍 " + bus.name + "</p>";
          });
        });
      }

      window.onload = initMap;
    </script>
  </body>
  </html>
  `);
});

// ================= LOGIN =================
app.get("/login", (req, res) => {
  res.send(`
  <html>
  <body style="font-family:Arial;text-align:center;padding-top:100px;">
    <h2>Admin Login</h2>
    <input id="u" placeholder="Username"><br><br>
    <input id="p" type="password" placeholder="Password"><br><br>
    <button onclick="login()">Login</button>

    <script>
      function login() {
        fetch('/api/login', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            username: u.value,
            password: p.value
          })
        })
        .then(res=>res.json())
        .then(d=>{
          if(d.success) location.href='/dashboard';
          else alert("Login failed");
        });
      }
    </script>
  </body>
  </html>
  `);
});

// ================= DASHBOARD =================
app.get("/dashboard", (req, res) => {
  res.send(`
  <html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  </head>

  <body style="font-family:Arial;">
    <h2>📊 Fleet Dashboard</h2>

    <canvas id="chart" width="400" height="200"></canvas>

    <script>
      fetch('/api/buses')
      .then(res=>res.json())
      .then(data=>{

        let labels = data.map(b => b.name);
        let values = data.map(b => Math.random()*10);

        new Chart(document.getElementById("chart"), {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Bus Activity',
              data: values
            }]
          }
        });

      });
    </script>
  </body>
  </html>
  `);
});

// ================= API =================
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  res.json({ success: username === admin.username && password === admin.password });
});

app.get("/api/buses", (req, res) => {
  res.json(buses);
});

// ================= SIMULATION =================
setInterval(() => {
  buses.forEach(bus => {
    bus.latitude += (Math.random() - 0.5) * 0.001;
    bus.longitude += (Math.random() - 0.5) * 0.001;
  });
}, 3000);

// ================= START =================
app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server running");
});
