const apiKey = "0cbbf41e7d5c43673524d76ba33c1521";
let isCelsius = true;
let shownCities = new Set();
let latestQuery = "";

function toggleDarkMode() {
  document.body.classList.toggle("dark");
}

function toggleUnit() {
  isCelsius = !isCelsius;
  const city = document.getElementById("cityInput").value.trim();
  if (city) getWeatherByCity();
}

function setWeatherBackground(main) {
  const type = main.toLowerCase();
  if (type.includes("rain")) {
    document.body.style.background = 'url("https://i.imgur.com/WQzM11Z.jpg") no-repeat center / cover';
  } else if (type.includes("cloud")) {
    document.body.style.background = 'url("https://i.imgur.com/nxlkReb.jpg") no-repeat center / cover';
  } else if (type.includes("clear")) {
    document.body.style.background = 'url("https://i.imgur.com/7yV7DRC.jpg") no-repeat center / cover';
  } else {
    document.body.style.background = '#e3f2fd';
  }
}

function updateMap(lat, lon) {
  const mapFrame = document.getElementById("mapFrame");
  mapFrame.src = `https://www.google.com/maps?q=${lat},${lon}&z=13&output=embed`;
}

function clearSuggestions() {
  document.getElementById("suggestions").innerHTML = "";
  shownCities.clear();
}

function addCitySuggestion(city, suggestionsList) {
  const label = `${city.name}, ${city.state || ""}, India`.trim();
  const normalizedLabel = label.toLowerCase();
  if (shownCities.has(normalizedLabel)) return;
  shownCities.add(normalizedLabel);

  const li = document.createElement("li");
  li.textContent = label;
  li.onclick = async () => {
    const fullName = `${city.name}, India`;
    document.getElementById("cityInput").value = fullName;
    clearSuggestions();
    // Automatically search without button click
    await getWeatherByCoords(city.lat, city.lon, city.name);
  };
  suggestionsList.appendChild(li);
}

document.getElementById("cityInput").addEventListener("focus", () => {
  clearSuggestions();
});

document.getElementById("cityInput").addEventListener("blur", () => {
  setTimeout(clearSuggestions, 150);
});

document.getElementById("cityInput").addEventListener("input", (e) => {
  suggestCities(e.target.value);
});

async function suggestCities(query) {
  clearSuggestions();
  const suggestionsList = document.getElementById("suggestions");
  if (query.length < 1) return;

  latestQuery = query;
  const thisCallQuery = query;

  try {
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=100&appid=${apiKey}`;
    const res = await fetch(geoUrl);
    const cities = await res.json();

    if (latestQuery !== thisCallQuery) return;

    const queryLower = query.toLowerCase();
    const seen = new Set();

    const filteredCities = cities.filter(city => city.country === "IN");

    const startsWith = filteredCities.filter(city =>
      city.name.toLowerCase().startsWith(queryLower)
    );
    const contains = filteredCities.filter(city =>
      !city.name.toLowerCase().startsWith(queryLower) &&
      city.name.toLowerCase().includes(queryLower)
    );

    const finalList = [...startsWith, ...contains];

    if (finalList.length > 0) {
      finalList.forEach(city => {
        const label = `${city.name}, ${city.state || ""}, India`.toLowerCase();
        if (!seen.has(label)) {
          seen.add(label);
          addCitySuggestion(city, suggestionsList);
        }
      });
    } else {
      const li = document.createElement("li");
      li.textContent = "No Indian cities found.";
      suggestionsList.appendChild(li);
    }
  } catch (err) {
    console.error("Suggestion error:", err);
    const li = document.createElement("li");
    li.textContent = "Error fetching suggestions.";
    suggestionsList.appendChild(li);
  }
}

async function getWeatherByCoords(lat, lon, cityName = "Selected Location") {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);
  const data = await res.json();
  const { main, weather } = data;
  setWeatherBackground(weather[0].main);
  displayWeather(cityName, main.temp, main.humidity, weather[0]);
  getForecast(lat, lon);
  updateMap(lat, lon);
}

async function getWeatherByCity() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) return;

  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`;
  const geoRes = await fetch(geoUrl);
  const geoData = await geoRes.json();

  if (!geoData.length || geoData[0].country !== "IN") {
    document.getElementById("weatherResult").innerText = "City not found in India.";
    return;
  }

  const { lat, lon, name } = geoData[0];
  getWeatherByCoords(lat, lon, name);
}

function getWeatherByLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      getWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
    }, () => alert("Location access denied."));
  } else {
    alert("Geolocation not supported.");
  }
}

function displayWeather(name, tempC, humidity, weather) {
  const temp = isCelsius ? `${tempC.toFixed(1)} °C` : `${(tempC * 9 / 5 + 32).toFixed(1)} °F`;
  document.getElementById("weatherResult").innerHTML = `
    <h2>Weather in ${name}</h2>
    <img src="https://openweathermap.org/img/wn/${weather.icon}@2x.png" alt="${weather.description}" />
    <p>${weather.description}</p>
    <p>🌡️ Temperature: ${temp}</p>
    <p>💧 Humidity: ${humidity}%</p>
  `;
}

async function getForecast(lat, lon) {
  const unit = isCelsius ? "metric" : "imperial";
  const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly&appid=${apiKey}&units=${unit}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.alerts?.length) {
    document.getElementById("alerts").innerHTML = `
      <h3>⚠️ Weather Alerts</h3>
      ${data.alerts.map(alert => `
        <div><strong>${alert.event}</strong><br><small>${alert.description}</small></div><br>
      `).join("")}
    `;
  } else {
    document.getElementById("alerts").innerHTML = "";
  }

  let forecastHTML = "<h3>7-Day Forecast</h3>";
  data.daily.slice(1, 8).forEach(day => {
    const d = new Date(day.dt * 1000);
    const name = d.toLocaleDateString("en-US", { weekday: "short" });
    forecastHTML += `
      <div class="forecast-day">
        <strong>${name}</strong><br>
        <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" />
        <div>${day.weather[0].main}</div>
        <div>${day.temp.day.toFixed(1)}${isCelsius ? '°C' : '°F'}</div>
      </div>
    `;
  });
  document.getElementById("forecast").innerHTML = forecastHTML;
}
