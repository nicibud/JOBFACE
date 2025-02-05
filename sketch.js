let faceapi;
let detections = [];
let video;
let canvas;
let backgroundImages = []; // Pole pro obrázky
let currentImageIndex = 0; // Index aktuálního obrázku
let lowImages = [];


// Ručně definované limity pro jednotlivé roky
const maxHappiness = {
  //1993: 95.7,
  //1994: 95.7,
  1995: 96.0,
  //1996: 96.1,
  //1997: 95.2,
  //1998: 93.5,
  //1999: 91.3,
  2000: 91.2,
  //2001: 91.9,
  //2002: 92.7,
  //2003: 92.2,
  //2004: 91.7,
  2005: 92.1,
  //2006: 92.9,
 //2007: 94.7,
  //2008: 95.6,
  //2009: 93.3,
 2010: 92.7,
  //2011: 93.3,
  //2012: 93.0,
  //2013: 93.0,
  //2014: 93.9,
  2015: 95.0,
  //2016: 96.0,
  //2017: 97.1,
  //2018: 97.8,
  //2019: 98.0,
  2020: 97.4,
  //2021: 97.2,
  //2022: 97.8,
  2023: 97.0,
};
let currentYear = 1995; // Výchozí rok
let maxHappinessValue = maxHappiness[currentYear]; // Maximální hodnota pro výchozí rok

function preload() {
  const years = Object.keys(maxHappiness); // Seznam aktivních roků
  lowImages = years.map((year) => loadImage(`${year}.png`)); // Načtení "low" obrázků pro každý rok
  backgroundImages[1] = loadImage("high.jpg"); // Obrázek pro vysoké skóre
}


function setup() {
  const canvasWidth = windowWidth * 0.8; // Šířka plátna
  const canvasHeight = windowHeight;

  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent("canvasContainer");

  video = createCapture(VIDEO);
  video.size(canvasWidth, canvasHeight);
  video.hide(); // Skryjeme původní video element

  const faceOptions = {
    withLandmarks: true,
    withExpressions: true,
    withDescriptors: true,
    minConfidence: 0.5,
  };

  faceapi = ml5.faceApi(video, faceOptions, faceReady);

  createYearButtons(); // Vytvoření tlačítek pro výběr roku

  // Přidání posluchače pro klávesnici
  document.addEventListener("keydown", handleKeyPress);
}


function createYearButtons() {
  const yearButtons = document.getElementById("yearButtons");

  // Vytvoření tlačítek pro jednotlivé roky
  Object.keys(maxHappiness).forEach((year) => {
    const button = document.createElement("button");
    button.textContent = year;

    // Stylování tlačítek
    button.style.padding = "10px";
    button.style.fontSize = "14px";
    button.style.color = "white"; // Barva textu
    button.style.background = "transparent"; // Průhledné pozadí
    button.style.border = "2px solid #444"; // Obrys tlačítka
    button.style.cursor = "pointer";
    button.style.borderRadius = "5px";
    button.style.textAlign = "center";
    button.style.transition = "border-color 0.3s ease"; // Plynulý přechod při změně

    // Kliknutí na tlačítko
    button.onclick = () => {
      currentYear = year; // Nastavení aktuálního roku
      maxHappinessValue = maxHappiness[year]; // Aktualizace maximální hodnoty
      document
        .querySelectorAll("#yearButtons button")
        .forEach((btn) => (btn.style.borderColor = "#444")); // Reset obrysu tlačítek
      button.style.borderColor = "#666"; // Zvýraznění aktivního roku
    };

    yearButtons.appendChild(button);
  });

  // Zvýraznění výchozího roku
  if (yearButtons.firstChild) {
    yearButtons.firstChild.style.borderColor = "#666";
  }
}



function faceReady() {
  console.log("FaceAPI model is ready!");
  faceapi.detect(gotFaces);
}

function gotFaces(error, result) {
  if (error) {
    console.error(error);
    return;
  }

  detections = result;
  faceapi.detect(gotFaces); // Opětovná detekce

  clear();
  updateBackground(); // Aktualizace pozadí
  drawMaskedVideo(); // Video viditelné pouze uvnitř rámečku
  drawBoxes(detections); // Vykreslení boxů
  drawLandmarks(detections); // Vykreslení bodů
}

function updateBackground() {
  if (detections.length > 0) {
    let emotionScore = calculateEmotionScore(detections[0].expressions);
    currentImageIndex = emotionScore > maxHappinessValue / 2 ? 1 : 0; // Přepínání obrázku na základě skóre
  }

  const years = Object.keys(maxHappiness); // Seznam aktivních roků
  const yearIndex = years.indexOf(currentYear.toString()); // Index aktuálního roku

  if (currentImageIndex === 0 && yearIndex >= 0) {
    // Pokud je low skóre a máme odpovídající obrázek
    image(lowImages[yearIndex], 0, 0, width, height);
  } else {
    // Zobrazí high obrázek
    image(backgroundImages[1], 0, 0, width, height);
  }
}


function calculateEmotionScore(expressions) {
  let happiness = expressions.happy || 0;
  let sadness = expressions.sad || 0;
  let anger = expressions.angry || 0;

  // Výpočet kombinovaného skóre emocí
  let emotionScore = ((happiness * 2) - sadness - anger) * 50;
  return constrain(emotionScore, 0, maxHappinessValue); // Ořezání hodnoty do definovaného limitu
}

function drawMaskedVideo() {
  if (detections.length > 0) {
    for (let f = 0; f < detections.length; f++) {
      let { _x, _y, _width, _height } = detections[f].alignedRect._box;

      // Maskování
      push();
      translate(0, 0);
      drawingContext.save();
      drawingContext.beginPath();
      drawingContext.rect(_x, _y, _width, _height);
      drawingContext.clip(); // Klipování na obličej
      image(video, 0, 0, width, height); // Video viditelné pouze uvnitř rámečku
      drawingContext.restore();
      pop();
    }
  }
}

function drawBoxes(detections) {
  if (detections.length > 0) {
    for (let f = 0; f < detections.length; f++) {
      let { _x, _y, _width, _height } = detections[f].alignedRect._box;

      let expressions = detections[f].expressions;
      let emotionScore = calculateEmotionScore(expressions);

      stroke(2, 0, 0); // Barva boxu
      strokeWeight(2);
      noFill();
      rect(_x, _y, _width, _height);

      // Nastavení výplně pod text
      noStroke();
      fill(0, 0, 0,); // Poloprůhledné černé pozadí
      let textWidth = 470; // Šířka pozadí za textem
      let textHeight = 35; // Výška pozadí za textem
      rect(_x + _width / 2 - textWidth / 2, _y - textHeight - 5, textWidth, textHeight, 3); // S mírně zaoblenými rohy

      // Vykreslení textu
      fill(255); // Bílá barva textu
      textSize(25);
      textAlign(CENTER);
      text(`Probability of getting(some) job: ${nf(emotionScore, 2, 2)}%`, _x + _width / 2, _y - 10);
    }
  }
}

function drawLandmarks(detections) {
  if (detections.length > 0) {
    for (let f = 0; f < detections.length; f++) {
      let points = detections[f].landmarks.positions;
      for (let i = 0; i < points.length; i++) {
        stroke(255, 255, 255);
        strokeWeight(3);
        point(points[i]._x, points[i]._y);
      }
    }
  }
}

function handleKeyPress(event) {
  if (event.key.toLowerCase() === "p") {
    if (video.elt.paused) {
      video.elt.play(); // Spuštění videa
      console.log("Video resumed");
    } else {
      video.elt.pause(); // Pozastavení videa
      console.log("Video paused");

      // Spuštění detekce na posledním snímku
      detectFromLastFrame();
    }
  }
}

function detectFromLastFrame() {
  if (!video.elt.paused) return; // Pokud video běží, neprovádíme další analýzu

  faceapi.detect((error, result) => {
    if (error) {
      console.error(error);
      return;
    }
    detections = result;
    console.log("Detekce proběhla na zastaveném snímku");
    // Aktualizace pozadí nebo jiných prvků na základě detekce
    updateBackground();

    // blikání vole
    //setTimeout(detectFromLastFrame, 1500); // Frekvence detekce při zastavení
  });
}




