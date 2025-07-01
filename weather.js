const apiKey = "0cbbf41e7d5c43673524d76ba33c1521";
let isCelsius = true;
let shownCities = new Set();
let latestQuery = "";

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
const statesOfIndia = [
  { state: "Andhra Pradesh", capital: "Amaravati", image:"https://luxoticholidays.com/blog/wp-content/uploads/2025/02/visakhapatnam-araku-valley.jpg"},
  { state: "Arunachal Pradesh", capital: "Itanagar", image: "https://www.shikhar.com/images/gallery/tours/171/71596486.jpg" },
  { state: "Assam", capital: "Dispur", image: "https://imgcld.yatra.com/ytimages/image/upload/v1517482087/AdvNation/ANN_DES71/ann_top_Assam_c49hzx.jpg" },
  { state: "Bihar", capital: "Patna", image: "https://cdn.britannica.com/12/94612-050-B4EEB84A/temple-Buddhist-Mahabodhi-Bihar-India-Bodh-Gaya.jpg" },
  { state: "Chhattisgarh", capital: "Raipur", image: "https://en-media.thebetterindia.com/uploads/2017/04/Naya-Raipur-3.png" },
  { state: "Goa", capital: "Panaji", image: " https://d26dp53kz39178.cloudfront.net/media/uploads/Travel_Guide_Images/Panaji_result.webp" },
  { state: "Gujarat", capital: "Gandhinagar", image: "https://www.clubmahindra.com/blog/media/section_images/gujaratban-3c609a6f099dd52.jpg" },
  { state: "Haryana", capital: "Chandigarh", image: "https://www.indiaeasytrip.com/states-of-india/places-to-visit-in-rajasthan/jodhpur-destination.gif" },
  { state: "Himachal Pradesh", capital: "Shimla", image: "https://tripxl.com/blog/wp-content/uploads/2024/08/Shimla-Road-and-mountains-view-OG-Photo.jpg" },
  { state: "Jharkhand", capital: "Ranchi", image: "https://s7ap1.scene7.com/is/image/incredibleindia/patratu-valley-ranchi-jharkhand-1-hero?qlt=82&ts=1726723957845" },
  { state: "Karnataka", capital: "Bengaluru", image: "https://www.financialexpress.com/wp-content/uploads/2023/06/Bengaluru-airport.jpg" },
  { state: "Kerala", capital: "Thiruvananthapuram", image: "https://assets.cntraveller.in/photos/65f445fc8411ed4511e9a4c9/master/pass/GettyImages-110051777.jpg" },
  { state: "Madhya Pradesh", capital: "Bhopal", image: "https://c.ndtvimg.com/2025-04/gm4gr0h_bhopal_625x300_24_April_25.jpg?im=FeatureCrop,algorithm=dnn,width=1200,height=738" },
  { state: "Maharashtra", capital: "Mumbai", image: " https://static.toiimg.com/photo/96586840.cms" },
  { state: "Manipur", capital: "Imphal", image: "https://mediaim.expedia.com/destination/1/3171633c98f260e10b8945264171acf3.jpg" },
  { state: "Meghalaya", capital: "Shillong", image: " https://www.abhibus.com/blog/wp-content/uploads/2023/08/Shillong0A-696x464.jpg" },
  { state: "Mizoram", capital: "Aizawl", image: "https://s7ap1.scene7.com/is/image/incredibleindia/1-solomon-temple-aizwal-mizoram-city-hero?qlt=82&ts=1726674760373" },
  { state: "Nagaland", capital: "Kohima", image: "https://www.thesevensister.com/blog/wp-content/uploads/2017/03/Kohima.jpg" },
  { state: "Odisha", capital: "Bhubaneswar", image: "https://www.indiantempletour.com/wp-content/uploads/2022/08/brahmeswara_temple_bhubaneswar-scaled.jpg" },
  { state: "Punjab", capital: "Chandigarh", image: "https://swarajya.gumlet.io/swarajya/2023-04/ee83ff79-d6fc-4f99-a833-f4d0faaaf7e3/drone_shot_v0_bvbh6et7i4w91.jpg?w=610&q=50&compress=true&format=auto" },
  { state: "Rajasthan", capital: "Jaipur", image: "https://s7ap1.scene7.com/is/image/incredibleindia/hawa-mahal-jaipur-rajasthan-city-1-hero?qlt=82&ts=1726660605161" },
  { state: "Sikkim", capital: "Gangtok", image: "https://tibro.in/blog/wp-content/uploads/2024/08/8th-image-1.jpg" },
  { state: "Tamil Nadu", capital: "Chennai", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Chennai_train_station.jpg/1200px-Chennai_train_station.jpg" },
  { state: "Telangana", capital: "Hyderabad", image: "https://a.travel-assets.com/findyours-php/viewfinder/images/res70/68000/68046-Hyderabad-And-Vicinity.jpg" },
  { state: "Tripura", capital: "Agartala", image: "https://assets.simplotel.com/simplotel/image/upload/x_0,y_12,w_1024,h_576,r_0,c_crop,q_80,fl_progressive/w_500,f_auto,c_fit/hotel-polo-towers/Ujjayanta_Palace" },
  { state: "Uttar Pradesh", capital: "Lucknow", image: "https://www.tajmahal.gov.in/images/tajmahal-view/day/1.jpg" },
  { state: "Uttarakhand", capital: "Dehradun", image: "https://dl.geu.ac.in/uploads/image/38S31Kc5-six-reasons-to-live-in-dehradun.jpg" },
  { state: "West Bengal", capital: "Kolkata", image:  "https://www.trawell.in/images/pics/west-bengal_all_main.jpg"},
  { state: "Delhi", capital: "Delhi", image: "https://media-cdn.tripadvisor.com/media/photo-s/16/e0/7b/c2/picture-clicked-at-the.jpg" }
];

async function loadStateCards() {
  const container = document.getElementById("space");
  container.innerHTML = "";

  statesOfIndia.forEach(async (item) => {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${item.capital}&appid=${apiKey}&units=metric`;
      const res = await fetch(url);
      const data = await res.json();
      const { temp, humidity } = data.main;

      const card = document.createElement("div");
      card.className = "state-card";
      card.innerHTML = `
        <img src="${item.image}" alt="${item.state}" onerror="this.src='https://via.placeholder.com/300x140?text=${item.state}'">
        <div class="info">
          <h4>${item.state}</h4>
          <p>🌡️ ${isCelsius ? temp.toFixed(1) + " °C" : (temp * 9 / 5 + 32).toFixed(1) + " °F"}</p>
          <p>💧 ${humidity}% Humidity</p>
        </div>
      `;
      container.appendChild(card);
    } catch (err) {
      console.error(`Error loading weather for ${item.state}:`, err);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadStateCards();
});

//  Scroll Progress Bar Logic
window.addEventListener("scroll", () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollPercent = (scrollTop / docHeight) * 100;
  document.getElementById("scroll-progress").style.width = scrollPercent + "%";
});
