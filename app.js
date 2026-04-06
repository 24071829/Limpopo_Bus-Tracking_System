const express = require("express");
const app = express();

app.use(express.json());

// ================= DATA =================
let buses = [
  { id: 1, name: "UNIVEN Bus", latitude: -22.976, longitude: 30.446, status: "Running" },
  { id: 2, name: "Thohoyandou Bus", latitude: -22.980, longitude: 30.450, status: "Running" }
];

// Route path
let route = [
  [-22.976, 30.446],
  [-22.978, 30.448],
  [-22.979, 30.449],
  [-22.980, 30.450]
];

// Bus stops
let stops = [
  { name: "UNIVEN Gate", lat: -22.976, lng: 30.446 },
  { name: "Shopping Center", lat: -22.978, lng: 30.448 },
  { name: "Taxi Rank", lat: -22.979, lng: 30.449 },
  { name: "Thohoyandou CBD", lat: -22.980, lng: 30.450 }
];

let admin = { username: "admin", password: "1234" };

// ================= HOME =================
app.get("/", (req, res) => {
  res.send(`
  <html>
  <body style="font-family:Arial;text-align:center;background:black;color:white;">
    <h1>🚍 Limpopo Smart Transport</h1>
    <p>Uber-Style Bus Tracking</p>
    <a href="/map"><button style="padding:15px;">Track Buses</button></a>
    <a href="/login"><button style="padding:15px;">Admin</button></a>
  </body>
  </html>
  `);
});

// ================= MAP =================
app.get("/map", (req, res) => {
  res.send(`
  <html>
  <head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

    <style>
      body { margin:0; font-family:Arial; }
      #map { height:100vh; }

      .panel {
        position:absolute;
        top:20px;
        left:20px;
        background:white;
        padding:15px;
        border-radius:10px;
      }
    </style>
  </head>

  <body>
    <div id="map"></div>

    <div class="panel">
      <h3>🚌 Live Buses</h3>
      <div id="list"></div>
    </div>

    <script>
      let map = L.map('map').setView([-22.976, 30.446], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      // Custom bus icon
      let busIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/61/61231.png',
        iconSize: [30, 30]
      });

      // Route
      let route = ${JSON.stringify(route)};
      L.polyline(route, {color: 'blue'}).addTo(map);

      // Stops
      let stops = ${JSON.stringify(stops)};
      stops.forEach(stop => {
        L.marker([stop.lat, stop.lng])
          .addTo(map)
          .bindPopup("📍 " + stop.name);
      });

      let markers = [];

      function calculateETA(busLat, busLng, stopLat, stopLng) {
        let distance = Math.sqrt(
          Math.pow(stopLat - busLat, 2) + 
          Math.pow(stopLng - busLng, 2)
        );
        return Math.round(distance * 1000); // fake minutes
      }

      function load() {
        fetch('/api/buses')
        .then(res => res.json())
        .then(data => {

          markers.forEach(m => map.removeLayer(m));
          markers = [];

          list.innerHTML = "";

          data.forEach(bus => {

            let marker = L.marker([bus.latitude, bus.longitude], {icon: busIcon})
              .addTo(map);

            // Calculate ETA to last stop
            let lastStop = stops[stops.length - 1];
            let eta = calculateETA(bus.latitude, bus.longitude, lastStop.lat, lastStop.lng);

            marker.bindPopup(
              "🚍 " + bus.name + 
              "<br>Status: " + bus.status +
              "<br>ETA: " + eta + " mins"
            );

            markers.push(marker);

            list.innerHTML += 
              "<p>🚍 " + bus.name + " - ETA: " + eta + " mins</p>";
          });

        });
      }

      load();
      setInterval(load, 3000);
    </script>

  </body>
  </html>
  `);
});

// ================= LOGIN =================
app.get("/login", (req, res) => {
  res.send(`
  <body style="text-align:center;font-family:Arial;">
    <h2>Admin Login</h2>
    <input id="u"><br><br>
    <input id="p" type="password"><br><br>
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
  `);
});

// ================= DASHBOARD =================
app.get("/dashboard", (req, res) => {
  res.send(`
  <html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  </head>
  <body>
    <h2>📊 Fleet Dashboard</h2>
    <canvas id="chart"></canvas>

    <script>
      fetch('/api/buses')
      .then(res=>res.json())
      .then(data=>{
        new Chart(document.getElementById("chart"), {
          type: 'bar',
          data: {
            labels: data.map(b=>b.name),
            datasets: [{
              label: 'Activity',
              data: data.map(()=>Math.random()*10)
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
