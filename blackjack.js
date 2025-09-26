const suits = ["♠", "♥", "♦", "♣"];
const ranks = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

let deck = [];
for (const s of suits) {
  for (const r of ranks) {
    deck.push({ rank: r, suit: s });
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
shuffle(deck);

function rankValue(rank) {
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  if (rank === "A") return 11; // 일단 11로 계산
  return parseInt(rank, 10);
}

function scoreHand(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += rankValue(c.rank);
    if (c.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10; // A를 1로 조정
    aces--;
  }
  return total;
}

function showHand(name, cards, score) {
  console.log(
    `${name}: [${cards.map((c) => c.rank + c.suit).join(", ")}] => ${score}`
  );
}

let playerHand = [deck.pop(), deck.pop()];
let dealerHand = [deck.pop(), deck.pop()];

let playerScore = scoreHand(playerHand);
showHand("Player", playerHand, playerScore);

if (playerScore === 21) {
  console.log("Blackjack! You win.");
  process.exit(0);
}

if (playerScore < 17) {
  playerHand.push(deck.pop());
  playerScore = scoreHand(playerHand);
  showHand("Player(Hit)", playerHand, playerScore);
}

if (playerScore > 21) {
  console.log("Player Bust! You lost.");
  process.exit(0);
}

let dealerScore = scoreHand(dealerHand);
showHand("Dealer", dealerHand, dealerScore);

while (dealerScore < 17) {
  dealerHand.push(deck.pop());
  dealerScore = scoreHand(dealerHand);
  showHand("Dealer(Hit)", dealerHand, dealerScore);
}

if (dealerScore > 21) {
  console.log("Dealer Bust! You win.");
  process.exit(0);
}

if (playerScore === dealerScore) {
  console.log("Draw.");
} else if (playerScore > dealerScore) {
  console.log("You win.");
} else {
  console.log("Bank wins.");
}
