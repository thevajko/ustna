const questionElement = document.getElementById('question');
const nextBtn = document.getElementById('nextBtn');
const toggleBgCheckbox = document.getElementById('toggleBgCheckbox');

let questions = [];
let lastQuestionIndex = -1;
let isAnimatingQuestion = false;

// nový stav: či je UI ešte v úvodnom režime (žiadna otázka nebola vybratá)
let isInitialScreen = true;

// --- náhodný background obrázok + pomalý, plynulo sa meniaci smer pohybu ---
const backgroundImages = [
    'imgs/bg01.png',
    'imgs/bg02.png',
    'imgs/bg03.png',
    'imgs/bg04.png',
    'imgs/bg05.png',
    'imgs/bg06.jpg',
    'imgs/bg07.jpg',
    'imgs/bg08.jpg',
    'imgs/bg09.jpg',
    // ...pridaj ďalšie, ak potrebuješ...
];

let stopBackgroundAnimation = false;
let backgroundInitialized = false;

function initRandomBackground() {
    if (!backgroundImages.length || backgroundInitialized) return;
    backgroundInitialized = true;

    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    const imageUrl = backgroundImages[randomIndex];

    const body = document.body;
    body.style.backgroundImage = `url('${imageUrl}')`;
    body.style.backgroundRepeat = 'repeat';
    body.style.backgroundAttachment = 'fixed';

    let posX = 0;
    let posY = 0;

    let dirX = 0.1;
    let dirY = 0.05;

    let targetDirX = dirX;
    let targetDirY = dirY;

    let lastDirChangeTime = performance.now();
    const directionChangeInterval = 24000;
    const directionLerpSpeed = 0.005;

    function pickNewTargetDirection() {
        // vypočítaj aktuálny uhol smeru
        const currentAngle = Math.atan2(dirY, dirX);
        const maxDelta = Math.PI / 4; // 45°
        const delta = (Math.random() * 2 * maxDelta) - maxDelta; // v rozsahu <-45°, +45°>
        const newAngle = currentAngle + delta;

        const speed = 0.12; // celková rýchlosť pohybu ostáva rovnaká
        targetDirX = Math.cos(newAngle) * speed;
        targetDirY = Math.sin(newAngle) * speed;
    }

    function animateBackground(now) {
        // ak je pozadie skryté, neanimuj a nič nemeníš (zostane biele)
        if (stopBackgroundAnimation) {
            requestAnimationFrame(animateBackground);
            return;
        }

        // po určitom čase zvoliť nový cieľový smer
        if (now - lastDirChangeTime > directionChangeInterval) {
            lastDirChangeTime = now;
            pickNewTargetDirection();
        }

        // plynulý prechod aktuálneho smeru k cieľovému (lineárna interpolácia)
        dirX += (targetDirX - dirX) * directionLerpSpeed;
        dirY += (targetDirY - dirY) * directionLerpSpeed;

        posX += dirX;
        posY += dirY;
        body.style.backgroundPosition = `${posX}px ${posY}px`;

        requestAnimationFrame(animateBackground);
    }

    // inicializuj prvý náhodný cieľový smer v rámci ±45° od počiatočného
    pickNewTargetDirection();
    requestAnimationFrame(animateBackground);
}

initRandomBackground();

// ovládanie cez checkbox
if (toggleBgCheckbox) {
    toggleBgCheckbox.addEventListener('change', () => {
        const body = document.body;
        if (toggleBgCheckbox.checked) {
            // skryť pozadie: biela farba, bez obrázka a animácia vypnutá
            stopBackgroundAnimation = true;
            body.style.backgroundImage = 'none';
            body.style.backgroundColor = '#ffffff';
        } else {
            // znova zapnúť pozadie: náhodný obrázok + animácia
            stopBackgroundAnimation = false;
            // ak ešte nebolo inicializované, inicializuj
            if (!backgroundInitialized) {
                initRandomBackground();
            } else {
                const randomIndex = Math.floor(Math.random() * backgroundImages.length);
                const imageUrl = backgroundImages[randomIndex];
                body.style.backgroundImage = `url('${imageUrl}')`;
            }
        }
    });
}
// --- koniec logiky backgroundu ---

// Načítanie otázok z JSON súboru
fetch('questions.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Nepodarilo sa načítať questions.json');
        }
        return response.json();
    })
    .then(data => {
        questions = data;
        // žiadna otázka sa teraz ešte nezobrazí – čakáme na interakciu používateľa
    })
    .catch(err => {
        questionElement.textContent = 'Chyba pri načítaní otázok: ' + err.message;
        nextBtn.disabled = true;
    });

// Pomocná funkcia: vyber náhodný index, ktorý nie je rovnaký ako posledný
function getRandomQuestionIndex() {
    if (!questions || questions.length === 0) return -1;
    if (questions.length === 1) return 0;

    let index;
    do {
        index = Math.floor(Math.random() * questions.length);
    } while (index === lastQuestionIndex);

    return index;
}

// Zobrazenie náhodnej otázky s animáciou (fade-out -> zmena textu -> fade-in)
function showRandomQuestion(skipAnimation = false) {
    if (!questions || questions.length === 0) {
        questionElement.textContent = 'Žiadne otázky nie sú k dispozícii.';
        return;
    }
    if (isAnimatingQuestion && !skipAnimation) {
        return; // počas animácie nespúšťaj ďalšiu
    }

    const newIndex = getRandomQuestionIndex();
    if (newIndex === -1) return;

    const newText = questions[newIndex];

    if (skipAnimation) {
        questionElement.textContent = newText;
        lastQuestionIndex = newIndex;
        return;
    }

    isAnimatingQuestion = true;

    // najprv fade-out starej otázky
    questionElement.classList.remove('question-fade-in');
    questionElement.classList.add('question-fade-out');

    const onFadeOutEnd = (e) => {
        if (e.target !== questionElement) return;

        questionElement.removeEventListener('animationend', onFadeOutEnd);
        // nastav novú otázku
        questionElement.textContent = newText;
        lastQuestionIndex = newIndex;

        // potom fade-in novej otázky
        questionElement.classList.remove('question-fade-out');
        questionElement.classList.add('question-fade-in');

        const onFadeInEnd = (e2) => {
            if (e2.target !== questionElement) return;
            questionElement.removeEventListener('animationend', onFadeInEnd);
            questionElement.classList.remove('question-fade-in');
            isAnimatingQuestion = false;
        };

        questionElement.addEventListener('animationend', onFadeInEnd);
    };

    questionElement.addEventListener('animationend', onFadeOutEnd);
}

// funkcia, ktorá z úvodnej obrazovky prejde na „normálny“ režim
function startAppIfNeeded() {
    if (!isInitialScreen || !questions || questions.length === 0) return;

    isInitialScreen = false;

    // skry úvodný text s animáciou, potom zobraz prvú otázku + UI
    questionElement.classList.remove('intro-visible');
    questionElement.classList.add('intro-hide');

    const onIntroHideEnd = (e) => {
        if (e.target !== questionElement) return;
        questionElement.removeEventListener('animationend', onIntroHideEnd);

        questionElement.classList.remove('intro-hide');

        // zobraziť tlačidlo a spodný blok (môžeš pridať aj CSS pre jemný fade-in, ak chceš)
        nextBtn.classList.remove('hidden');
        document.getElementById('bgToggleContainer').classList.remove('hidden');

        // po prvom spustení zobraz otázku bez fade-out starej (lebo tam bol len info text)
        showRandomQuestion(true);
    };

    questionElement.addEventListener('animationend', onIntroHideEnd);
}

// Klik na otázku v úvodnom režime
questionElement.addEventListener('click', () => {
    startAppIfNeeded();
});

// Klik na tlačidlo -> ďalšia otázka
nextBtn.addEventListener('click', () => showRandomQuestion(false));

// Ovládanie medzerníkom a Enterom
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (isInitialScreen) {
            startAppIfNeeded();
            return;
        }
        if (!nextBtn.disabled) {
            showRandomQuestion(false);
        }
    }
});
