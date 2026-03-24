import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Moon, Sun, Utensils, Edit2, Shield, X, Save, 
  Home, Clock, User, Plus, ChevronRight, PieChart, Trash2,
  Calculator, Users, ArrowUpDown, LogOut, Lock, Database, CheckCircle2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithCustomToken, onAuthStateChanged, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut 
} from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc, addDoc, writeBatch } from 'firebase/firestore';

// --- 1. FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyDYJNiJtKccTPlnyykZwWMrOgza0qjW4ZY",
  authDomain: "pointtracker-aa3ef.firebaseapp.com",
  projectId: "pointtracker-aa3ef",
  storageBucket: "pointtracker-aa3ef.firebasestorage.app",
  messagingSenderId: "412618494533",
  appId: "1:412618494533:web:cad5143f3c16b761c7c92c"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'pointtracker-app';

// --- 2. DIE KOMPLETTEN PDF-DATEN FÜR DEN IMPORT ---
const fullPDFData = [
  // Brot & Brötchen
  { n: "Brot, jede Sorte, 1 Scheibe", c: "Brot & Brötchen", p: 2 },
  { n: "Baguette-Brötchen, 1 Stück", c: "Brot & Brötchen", p: 4 },
  { n: "Brötchen, jede Sorte", c: "Brot & Brötchen", p: 2 },
  { n: "Croissant, 1 Stück", c: "Brot & Brötchen", p: 8.5 },
  { n: "Fladenbrot, 1 Ecke, 50g", c: "Brot & Brötchen", p: 2 },
  { n: "Knäckebrot, 1 Scheibe", c: "Brot & Brötchen", p: 0.5 },
  { n: "Schwarzbrot", c: "Brot & Brötchen", p: 1.5 },
  { n: "Toastbrot, 1 Scheibe, 20g", c: "Brot & Brötchen", p: 1 },
  { n: "Zopf, 1 Scheibe, 50g", c: "Brot & Brötchen", p: 3.5 },
  { n: "Zwieback, 1 Scheibe", c: "Brot & Brötchen", p: 0.5 },
  // Brotaufstriche
  { n: "Erdnusscreme, 1 TL, 5g", c: "Brotaufstriche", p: 1 },
  { n: "Marmelade/Konfitüre 1 TL, 5g", c: "Brotaufstriche", p: 0 },
  { n: "Marmelade/Konfitüre 2 TL, 10g", c: "Brotaufstriche", p: 0.5 },
  { n: "Honig, 1 TL, 5g", c: "Brotaufstriche", p: 0 },
  { n: "Honig, 2 TL, 10g", c: "Brotaufstriche", p: 0.5 },
  { n: "Nuss-Nougatcreme 1 TL, 5g", c: "Brotaufstriche", p: 0.5 },
  { n: "Pflaumenmus, 3 TL", c: "Brotaufstriche", p: 0.5 },
  { n: "Zuckerrübensirup 2 TL, 10g", c: "Brotaufstriche", p: 0.5 },
  // Dessert & Süßspeisen
  { n: "Apfelkompott / Apfelmus mit Zucker, 2 TL", c: "Dessert & Süßspeisen", p: 0.5 },
  { n: "Crêpes, 1 Stück, 70g", c: "Dessert & Süßspeisen", p: 4 },
  { n: "Dampfnudel, 1 kleine, 50g", c: "Dessert & Süßspeisen", p: 3.5 },
  { n: "Fruchtcocktail, 1 EL, 20g", c: "Dessert & Süßspeisen", p: 0.5 },
  { n: "Fruchtcreme, 1 kl. Schale, 150g", c: "Dessert & Süßspeisen", p: 7 },
  { n: "Fruchtsalat, mit Zucker, 2 EL", c: "Dessert & Süßspeisen", p: 0.5 },
  { n: "Götterspeise mit Zucker, 100g", c: "Dessert & Süßspeisen", p: 5 },
  { n: "Grießbrei, 150g", c: "Dessert & Süßspeisen", p: 4 },
  { n: "Milchreis, 125g", c: "Dessert & Süßspeisen", p: 2 },
  { n: "Mokka-/Schokoladensauce, 1 EL", c: "Dessert & Süßspeisen", p: 0.5 },
  { n: "Mousse au Chocolat, 125g", c: "Dessert & Süßspeisen", p: 10.5 },
  { n: "Tiramisu, 150g", c: "Dessert & Süßspeisen", p: 8 },
  { n: "Vanille-/Schokoladenpudding, 125g", c: "Dessert & Süßspeisen", p: 3 },
  { n: "Vanillesauce, 1 EL", c: "Dessert & Süßspeisen", p: 0.5 },
  { n: "Weincreme, 125g", c: "Dessert & Süßspeisen", p: 7 },
  // Eis
  { n: "Eisbecher mit Sahne & Früchte, 170g", c: "Eis", p: 8.5 },
  { n: "Eiscreme, 1 Kugel, 50g", c: "Eis", p: 2.5 },
  { n: "Eiskaffee, 1 Glas, 200ml", c: "Eis", p: 5.5 },
  { n: "Fruchteis-/Milcheis, 1 Kugel, 50g", c: "Eis", p: 1.5 },
  { n: "Softeis mit Waffel, 1 Stück", c: "Eis", p: 3 },
  { n: "Sorbet, 1 Glas, 200ml", c: "Eis", p: 4 },
  { n: "Wassereis am Stiel, 1 Stück", c: "Eis", p: 1 },
  { n: "Eiscreme am Stiel mit Schoko, 1 Stück", c: "Eis", p: 8 },
  // Fette & Öle
  { n: "Butter, 1 TL, 5g", c: "Fette & Öle", p: 1 },
  { n: "Butter, halbfett, 1TL", c: "Fette & Öle", p: 0.5 },
  { n: "Mayonnaise, 20% Fett, 2 TL", c: "Fette & Öle", p: 0.5 },
  { n: "Mayonnaise, 50% Fett, 1 TL", c: "Fette & Öle", p: 0.5 },
  { n: "Mayonnaise, 80% Fett, 1 TL", c: "Fette & Öle", p: 1 },
  { n: "Pflanzencreme, 1 TL, 5g", c: "Fette & Öle", p: 1 },
  { n: "Pflanzenmargarine, fettreduziert, 2 TL", c: "Fette & Öle", p: 1.5 },
  { n: "Pflanzenmargarine, halbfett, 1 TL", c: "Fette & Öle", p: 0.5 },
  { n: "Pflanzenöl, 1 TL, 5g", c: "Fette & Öle", p: 1 },
  { n: "Remoulade, bis 65% Fett, 1 TL", c: "Fette & Öle", p: 1 },
  { n: "Schweineschmalz, 1 TL, 5g", c: "Fette & Öle", p: 1.5 },
  // Fisch
  { n: "Aal, frisch, 100g roh", c: "Fisch", p: 7.5 },
  { n: "Aal, geräuchert, 40g", c: "Fisch", p: 3.5 },
  { n: "Austern, 3 Stück, 50g", c: "Fisch", p: 0.5 },
  { n: "Bismarckhering, 1 Stück, 110g", c: "Fisch", p: 6 },
  { n: "Brathering, 1 kleiner, 100g", c: "Fisch", p: 5 },
  { n: "Bückling, geräuchert, 110g", c: "Fisch", p: 6 },
  { n: "Egli, 10 Filets, 150g", c: "Fisch", p: 2 },
  { n: "Fisch, fettarm (Schellfisch/Seelachs), 150g", c: "Fisch", p: 2 },
  { n: "Fischfilet, paniert, 150g", c: "Fisch", p: 7 },
  { n: "Fischstäbchen, 1 Stück, 30g", c: "Fisch", p: 1 },
  { n: "Forelle, geräuchert, 60g", c: "Fisch", p: 1.5 },
  { n: "Forelle, frisch, 300g", c: "Fisch", p: 6 },
  { n: "Forelle, TK, 200g", c: "Fisch", p: 4 },
  { n: "Garnelen, 5 Stück, 30g", c: "Fisch", p: 0.5 },
  { n: "Heilbutt, schwarz, geräuchert, 100g", c: "Fisch", p: 5.5 },
  { n: "Heilbutt, schwarz, frisch, 125g", c: "Fisch", p: 4.5 },
  { n: "Heilbutt, weiß, frisch, 125g", c: "Fisch", p: 2 },
  { n: "Hering in Gelee, 150g", c: "Fisch", p: 6 },
  { n: "Hering, frisch, 90g", c: "Fisch", p: 5 },
  { n: "Heringsfilet in Sahnesauce, 60g", c: "Fisch", p: 4 },
  { n: "Heringsfilet in Tomatensauce, 95g", c: "Fisch", p: 4.5 },
  { n: "Hummer, 125g", c: "Fisch", p: 2 },
  { n: "Kabeljau / Dorsch, frisch, 150g", c: "Fisch", p: 2 },
  { n: "Karpfen, frisch, 100g", c: "Fisch", p: 2.5 },
  { n: "Katfisch/Steinbeißer, 125g", c: "Fisch", p: 2 },
  { n: "Kaviar, echt, 2 TL", c: "Fisch", p: 0.5 },
  { n: "Kaviar, Ersatz, 4 TL", c: "Fisch", p: 0.5 },
  { n: "Krabben, 1 EL, 25g", c: "Fisch", p: 0.5 },
  { n: "Lachs, geräuchert, 60g", c: "Fisch", p: 2 },
  { n: "Lachs, 1 kl. Steak, 125g", c: "Fisch", p: 3.5 },
  { n: "Makrele in Öl, 1 EL", c: "Fisch", p: 2 },
  { n: "Makrele, geräuchert, 75g", c: "Fisch", p: 3.5 },
  { n: "Makrele, frisch, 90g", c: "Fisch", p: 4 },
  { n: "Matjeshering, 1 Stück, 80g", c: "Fisch", p: 5 },
  { n: "Muscheln, 500g", c: "Fisch", p: 5 },
  { n: "Ölsardinen, 1 EL, 30g", c: "Fisch", p: 1.5 },
  { n: "Rollmops, 1 Stück, 80g", c: "Fisch", p: 2.5 },
  { n: "Rotbarsch, frisch, 150g", c: "Fisch", p: 3 },
  { n: "Rotbarsch, geräuchert, 100g", c: "Fisch", p: 3 },
  { n: "Sardellen in Salzlake, 5 Stück", c: "Fisch", p: 0.5 },
  { n: "Sardine, 1 Stück, 60g", c: "Fisch", p: 2 },
  { n: "Schellfisch, geräuchert, 75g", c: "Fisch", p: 1 },
  { n: "Schellfisch, frisch, 150g", c: "Fisch", p: 2 },
  { n: "Schillerlocke 1/2 kleine, 60g", c: "Fisch", p: 4.5 },
  { n: "Scholle, 1 Filet, 70g", c: "Fisch", p: 1 },
  { n: "Seehecht/Hechtdorsch, 125g", c: "Fisch", p: 2 },
  { n: "Seelachs in Öl, 1 Scheibe, 25g", c: "Fisch", p: 3 },
  { n: "Seezunge, 1 Filet, 70g", c: "Fisch", p: 1 },
  { n: "Sprotte, geräuchert, 15g", c: "Fisch", p: 1 },
  { n: "Tunfisch, frisch, 100g", c: "Fisch", p: 5.5 },
  { n: "Tunfisch im eigenen Saft, 1 EL", c: "Fisch", p: 1 },
  { n: "Tintenfisch, 125g roh", c: "Fisch", p: 0.5 },
  // Fleisch & Wurst
  { n: "Bauchspeck, 1 kl. Stück, 10g", c: "Fleisch & Wurst", p: 1 },
  { n: "Bierschinken, 1 Scheibe, 20g", c: "Fleisch & Wurst", p: 1 },
  { n: "Bierwurst, 1 Scheibe, 20g", c: "Fleisch & Wurst", p: 1.5 },
  { n: "Blutwurst, 1 Scheibe, 20g", c: "Fleisch & Wurst", p: 1.5 },
  { n: "Cervelat-Wurst, 1 Scheibe, 20g", c: "Fleisch & Wurst", p: 2 },
  { n: "Corned Beef, 1 Scheibe, 25g", c: "Fleisch & Wurst", p: 0.5 },
  { n: "Fleischkäse/Leberkäse, 100g", c: "Fleisch & Wurst", p: 8 },
  { n: "Fleischwurst, 1 Scheibe, 20g", c: "Fleisch & Wurst", p: 1.5 },
  { n: "Frankfurter Rindswurst, 100g", c: "Fleisch & Wurst", p: 6 },
  { n: "Frikadelle, 1 kl. 100g", c: "Fleisch & Wurst", p: 6 },
  { n: "Früchstücksspeck, 1 Scheibe, 25g", c: "Fleisch & Wurst", p: 4.5 },
  { n: "Hackfleisch, gemischt, 1 EL", c: "Fleisch & Wurst", p: 2 },
  { n: "Jagdwurst, 1 Scheibe, 20g", c: "Fleisch & Wurst", p: 1 },
  { n: "Kalbfleisch, mager, 125g", c: "Fleisch & Wurst", p: 2 },
  { n: "Kalbsbratwurst, 1 Stück, 150g", c: "Fleisch & Wurst", p: 11 },
  { n: "Kalbsleberwurst, 1 EL, 15g", c: "Fleisch & Wurst", p: 1.5 },
  { n: "Kammscheibe vom Schwein, 150g", c: "Fleisch & Wurst", p: 7 },
  { n: "Kassler, 1 kl. Stück, 125g", c: "Fleisch & Wurst", p: 4 },
  { n: "Kassleraufschnitt, 1 Scheibe, 15g", c: "Fleisch & Wurst", p: 0.5 },
  { n: "Knackwurst, 1 Stück, 100g", c: "Fleisch & Wurst", p: 8 },
  { n: "Lachsschinken, 2 Scheiben, 20g", c: "Fleisch & Wurst", p: 0.5 },
  { n: "Lammkotelett, 1 kl., 80g", c: "Fleisch & Wurst", p: 4 },
  { n: "Landjäger, 1 Stück, 90g", c: "Fleisch & Wurst", p: 11.5 },
  { n: "Leber, 100g", c: "Fleisch & Wurst", p: 2.5 },
  { n: "Leberknödel, 1 Stück, 100g", c: "Fleisch & Wurst", p: 4.5 },
  { n: "Leberwurst, 1 EL, 15g", c: "Fleisch & Wurst", p: 1.5 },
  { n: "Lyoner, 1 Stück, 125g", c: "Fleisch & Wurst", p: 10 },
  { n: "Lyoner Wurst, 1 Scheibe, 20g", c: "Fleisch & Wurst", p: 1.5 },
  { n: "Mettenden, 1 Stück, 75g", c: "Fleisch & Wurst", p: 8 },
  { n: "Mettwurst, 1 EL, 15g", c: "Fleisch & Wurst", p: 1.5 },
  { n: "Mortadella, 1 Scheibe, 20g", c: "Fleisch & Wurst", p: 1.5 },
  { n: "Pferdefleisch, mager, 125g", c: "Fleisch & Wurst", p: 2.5 },
  { n: "Presskopf, 1 Scheibe, 30g", c: "Fleisch & Wurst", p: 2 },
  { n: "Rinderhackfleisch, 1 EL, 30g", c: "Fleisch & Wurst", p: 1.5 },
  { n: "Rinderroulade, 1 kl., 160g", c: "Fleisch & Wurst", p: 4 },
  { n: "Rindersteak, 140g", c: "Fleisch & Wurst", p: 4.5 },
  { n: "Rindfleisch, geräuchert, 50g", c: "Fleisch & Wurst", p: 1 },
  { n: "Roastbeef, 1 Scheibe, 20g", c: "Fleisch & Wurst", p: 0.5 },
  { n: "Rostbratwurst, 1 Stück, 100g", c: "Fleisch & Wurst", p: 10 },
  { n: "Salami, 1 dünne Scheibe, 20g", c: "Fleisch & Wurst", p: 2 },
  { n: "Schinken, gekocht, ohne Fett, 20g", c: "Fleisch & Wurst", p: 0.5 },
  { n: "Schinkenwurst, 1 Scheibe, 20g", c: "Fleisch & Wurst", p: 1.5 },
  { n: "Schweinesülze, 25g", c: "Fleisch & Wurst", p: 1 },
  { n: "Schweinebratenaufschnitt, 15 g", c: "Fleisch & Wurst", p: 0.5 },
  { n: "Schweinefleisch, mager, 150g", c: "Fleisch & Wurst", p: 3 },
  { n: "Schweinehackfleisch, 1 EL, 30g", c: "Fleisch & Wurst", p: 2 },
  { n: "Schweinekotelett, 1 Stück, 150g", c: "Fleisch & Wurst", p: 4 },
  { n: "Schweinekotelett paniert, 150g", c: "Fleisch & Wurst", p: 7.5 },
  { n: "Schweineschnitzel, 150g", c: "Fleisch & Wurst", p: 3 },
  { n: "Schweinsbratwurst, 1 Stück, 150g", c: "Fleisch & Wurst", p: 12.5 },
  { n: "Teewurst, 1 EL, 15g", c: "Fleisch & Wurst", p: 2 },
  { n: "Weißwurst, 1 Stück, 60g", c: "Fleisch & Wurst", p: 4.5 },
  { n: "Wiener Würstchen, 1 Stück, 70g", c: "Fleisch & Wurst", p: 6 },
  { n: "Wild, mager, 125g", c: "Fleisch & Wurst", p: 3 },
  { n: "Zungenwurst, 1 Scheibe, 30g", c: "Fleisch & Wurst", p: 2 },
  // Geflügel
  { n: "Brathähnchen, mit Haut, 1/2, 370g", c: "Geflügel", p: 12.5 },
  { n: "Brathähnchen, ohne Haut, 1/2, 280g", c: "Geflügel", p: 5 },
  { n: "Ente, mit Haut, 150g", c: "Geflügel", p: 8.5 },
  { n: "Entenbrust, ohne Haut, 150g", c: "Geflügel", p: 5.5 },
  { n: "Gans, mit Haut, 150g", c: "Geflügel", p: 10.5 },
  { n: "Gans, ohne Haut, 150g", c: "Geflügel", p: 5 },
  { n: "Gänsekeule, 300g", c: "Geflügel", p: 11 },
  { n: "Geflügelbrustaufschnitt, geräuchert, 20g", c: "Geflügel", p: 0.5 },
  { n: "Geflügelfrikadelle, 100g", c: "Geflügel", p: 6 },
  { n: "Geflügelleber, 100g", c: "Geflügel", p: 2.5 },
  { n: "Geflügelleberwurst, 1 EL, 15g", c: "Geflügel", p: 1 },
  { n: "Geflügelmortadella, 1 Scheibe, 20g", c: "Geflügel", p: 1 },
  { n: "Geflügelsalami, 1 Scheibe, 20g", c: "Geflügel", p: 1.5 },
  { n: "Geflügelschnitzel/-filet, 120g", c: "Geflügel", p: 2 },
  { n: "Geflügelwurstaufschnitt, 1 Scheibe, 20g", c: "Geflügel", p: 1 },
  { n: "Hähnchenkeule mit Haut, 1 Schenkel", c: "Geflügel", p: 5.5 },
  { n: "Hähnchenkeule ohne Haut, 1 Schenkel", c: "Geflügel", p: 2.5 },
  { n: "Putenschnitzel, paniert, 150g", c: "Geflügel", p: 4.5 },
  { n: "Straußenfleisch, 120g", c: "Geflügel", p: 2 },
  { n: "Suppenhuhn, 1 kl. Portion, 150g", c: "Geflügel", p: 6.5 },
  // Gemüse & Hülsenfrüchte
  { n: "Artischocken, Auberginen, Blattsalat", c: "Gemüse & Hülsenfrüchte", p: 0 },
  { n: "Sellerie, Blumenkohl, Bohnen, Broccoli", c: "Gemüse & Hülsenfrüchte", p: 0 },
  { n: "Chinakohl, Fenchel, Gemüsesaft, Grünkohl", c: "Gemüse & Hülsenfrüchte", p: 0 },
  { n: "Gurken eingelegt, Knoblauch, Kohlrabi", c: "Gemüse & Hülsenfrüchte", p: 0 },
  { n: "Kürbis, Möhren, Paprikaschoten, Pilze", c: "Gemüse & Hülsenfrüchte", p: 0 },
  { n: "Porree, Radieschen, Rhabarber, Rosenkohl", c: "Gemüse & Hülsenfrüchte", p: 0 },
  { n: "Rotkohl, Rote Bete, Rüben, Sauerkraut", c: "Gemüse & Hülsenfrüchte", p: 0 },
  { n: "Schwarzwurzeln, Spargel, Spinat, Tomaten", c: "Gemüse & Hülsenfrüchte", p: 0 },
  { n: "Weißkohl, Wirsing, Zucchini, Zwiebel", c: "Gemüse & Hülsenfrüchte", p: 0 },
  { n: "Zuckererbsen, 1 Hand voll, 50g", c: "Gemüse & Hülsenfrüchte", p: 0.5 },
  { n: "Oliven, 5 Stück", c: "Gemüse & Hülsenfrüchte", p: 0.5 },
  { n: "Mais, Konserve, 2 EL, 50g", c: "Gemüse & Hülsenfrüchte", p: 0.5 },
  { n: "Hülsenfrüchte (Linsen, Erbsen, Bohnen), 1 EL", c: "Gemüse & Hülsenfrüchte", p: 0.5 },
  // Getränke, alkoholfrei
  { n: "Alkoholfreies Bier, 200ml", c: "Getränke, alkoholfrei", p: 1 },
  { n: "Apfelsaftschorle, 200ml", c: "Getränke, alkoholfrei", p: 0.5 },
  { n: "Bitter Lemon, 200ml", c: "Getränke, alkoholfrei", p: 1 },
  { n: "Cappuccino mit Milch, 1 Tasse, 150ml", c: "Getränke, alkoholfrei", p: 1 },
  { n: "Cola, 200ml", c: "Getränke, alkoholfrei", p: 2 },
  { n: "Cola light", c: "Getränke, alkoholfrei", p: 0 },
  { n: "Diät-Multivitaminsaft, 200ml", c: "Getränke, alkoholfrei", p: 0.5 },
  { n: "Eistee, 200ml", c: "Getränke, alkoholfrei", p: 1 },
  { n: "Energie-Drinks, 200ml", c: "Getränke, alkoholfrei", p: 1.5 },
  { n: "Früchtetee / Kräutertee / Kaffee", c: "Getränke, alkoholfrei", p: 0 },
  { n: "Fruchtsaft, 200ml", c: "Getränke, alkoholfrei", p: 1 },
  { n: "Ginger Ale, 200ml", c: "Getränke, alkoholfrei", p: 1 },
  { n: "Light Getränke, Wasser, Mineralwasser", c: "Getränke, alkoholfrei", p: 0 },
  { n: "Kakao, Schokolade, 200ml", c: "Getränke, alkoholfrei", p: 5 },
  { n: "Tea & Fruit, mit Zucker, 200ml", c: "Getränke, alkoholfrei", p: 1 },
  // Getränke, alkoholisch
  { n: "Apfelwein, 200ml", c: "Getränke, alkoholisch", p: 1.5 },
  { n: "Berliner Weiße mit Schluck, 250ml", c: "Getränke, alkoholisch", p: 2 },
  { n: "Radler, Alster, 200ml", c: "Getränke, alkoholisch", p: 1 },
  { n: "Bier, jede Sorte (außer Starkbier), 330ml", c: "Getränke, alkoholisch", p: 2.5 },
  { n: "Bockbier, 200ml", c: "Getränke, alkoholisch", p: 2 },
  { n: "Bowle, Punsch, 200ml", c: "Getränke, alkoholisch", p: 3.5 },
  { n: "Campari, 100ml", c: "Getränke, alkoholisch", p: 1 },
  { n: "Cognac / Rum / Schnaps / Whisky, 20ml", c: "Getränke, alkoholisch", p: 1 },
  { n: "Dessertwein, 50ml", c: "Getränke, alkoholisch", p: 1.5 },
  { n: "Glühwein, 200ml", c: "Getränke, alkoholisch", p: 3.5 },
  { n: "Likör, jede Sorte, 20ml", c: "Getränke, alkoholisch", p: 1 },
  { n: "Malzbier, 200ml", c: "Getränke, alkoholisch", p: 2 },
  { n: "Sekt, Champagner, jede Sorte, 100ml", c: "Getränke, alkoholisch", p: 1.5 },
  { n: "Sherry, 50ml", c: "Getränke, alkoholisch", p: 1 },
  { n: "Wein, schwere & süße, 100ml", c: "Getränke, alkoholisch", p: 1.5 },
  { n: "Wein, trocken, 100ml", c: "Getränke, alkoholisch", p: 1 },
  { n: "Weinbrand, 20ml", c: "Getränke, alkoholisch", p: 1 },
  { n: "Weinschorle, 200ml", c: "Getränke, alkoholisch", p: 1 },
  { n: "Weizenbier, 500ml", c: "Getränke, alkoholisch", p: 4 },
  { n: "Wermut, süß, 50ml", c: "Getränke, alkoholisch", p: 1.5 },
  { n: "Wermut, trocken, 50ml", c: "Getränke, alkoholisch", p: 1 },
  // Getreide & Getreideprodukte
  { n: "Cornflakes, 1 Tasse, 20g", c: "Getreide & Getreideprodukte", p: 1 },
  { n: "Popcorn, Puffreis, 40g", c: "Getreide & Getreideprodukte", p: 2 },
  { n: "Getreidekörner, 1 Tasse, 100g", c: "Getreide & Getreideprodukte", p: 1 },
  { n: "Grieß, trocken, 1 EL, 20g", c: "Getreide & Getreideprodukte", p: 0.5 },
  { n: "Hafer- / Getreideflocken, 1 EL, 10g", c: "Getreide & Getreideprodukte", p: 0.5 },
  { n: "Hirse trocken, 1 EL, 20g", c: "Getreide & Getreideprodukte", p: 1 },
  { n: "Knuspermüsli, gesüßt, geröstet, 1 EL", c: "Getreide & Getreideprodukte", p: 1 },
  { n: "Mais, trocken (Popcorn), 1 EL", c: "Getreide & Getreideprodukte", p: 0.5 },
  { n: "Mehl, jede Sorte, 1 TL, 10g", c: "Getreide & Getreideprodukte", p: 0.5 },
  { n: "Milchreis, trocken, 1 EL, 20g", c: "Getreide & Getreideprodukte", p: 1 },
  { n: "Müsliriegel, 1 kl., 25g", c: "Getreide & Getreideprodukte", p: 2 },
  { n: "Paniermehl, 1 EL, 10g", c: "Getreide & Getreideprodukte", p: 0.5 },
  { n: "Reis, jede Sorte, 1 EL, 20g", c: "Getreide & Getreideprodukte", p: 1 },
  { n: "Reiswaffel, 1 St., 8g", c: "Getreide & Getreideprodukte", p: 0.5 },
  { n: "Schokomüsli, 1 EL, 10g", c: "Getreide & Getreideprodukte", p: 1 },
  { n: "Stärkemehl, 1 EL, 10g", c: "Getreide & Getreideprodukte", p: 0.5 },
  // Kartoffel & Klöße
  { n: "Bratkartoffeln, 1 Port., 200g", c: "Kartoffel & Klöße", p: 7 },
  { n: "Kartoffelklöße, Fertigprodukt, 1 St., 90g", c: "Kartoffel & Klöße", p: 1.5 },
  { n: "Kartoffelklöße, Pulver, 1 EL, 10g", c: "Kartoffel & Klöße", p: 0.5 },
  { n: "Kartoffelklöße, selbsthergestellt, 1 St., 100g", c: "Kartoffel & Klöße", p: 2 },
  { n: "Kartoffelkroketten, verzehrfertig, 1 St., 30g", c: "Kartoffel & Klöße", p: 1 },
  { n: "Kartoffeln, (Sattmacherportion)", c: "Kartoffel & Klöße", p: 2 },
  { n: "Kartoffelpüree, Fertigprodukt, Pulver, 1 EL", c: "Kartoffel & Klöße", p: 1 },
  { n: "Ofen-Pommes Frites, 150g", c: "Kartoffel & Klöße", p: 6.5 },
  { n: "Reibekuchen, verzehrfertig, 1 St., 60g", c: "Kartoffel & Klöße", p: 4.5 },
  { n: "Rösti, 1 St., 60g", c: "Kartoffel & Klöße", p: 2 },
  { n: "Semmelknödel, 1 St., 100g", c: "Kartoffel & Klöße", p: 3.5 },
  { n: "Süßkartoffel, 1 St., 50g", c: "Kartoffel & Klöße", p: 1 },
  // Käse
  { n: "Camembert/Brie, 45% Fett, 1 kl. Ecke, 30g", c: "Käse", p: 1.5 },
  { n: "Camembert, 60% Fett", c: "Käse", p: 3 },
  { n: "Edelpilzkäse, 45% Fett, 1 kl. Ecke", c: "Käse", p: 2 },
  { n: "Edelpilzkäse, 65% Fett, 1 kl. Ecke", c: "Käse", p: 4 },
  { n: "Frischkäse, Natur/Kräuter, 30% Fett, 1 EL", c: "Käse", p: 0.5 },
  { n: "Gorgonzola, 1 kl. Ecke, 30g", c: "Käse", p: 3 },
  { n: "Hartkäse (z.B. Emmentaler), 45%, 30g", c: "Käse", p: 2.5 },
  { n: "Käse, gerieben (Parmesan), 30-32%, 1 EL", c: "Käse", p: 0.5 },
  { n: "Kochkäse, 10% Fett, 2 TL", c: "Käse", p: 0.5 },
  { n: "Mozzarella, 1/2 Kugel, 50g", c: "Käse", p: 3 },
  { n: "Raclette-Käse, 60% Fett, 1 Scheibe, 30g", c: "Käse", p: 3 },
  { n: "Roquefort, 1 kl. Ecke, 30g", c: "Käse", p: 3 },
  { n: "Sauermilchkäse (z.B. Harzer), 1 kl. Rolle", c: "Käse", p: 2 },
  { n: "Schafkäse / Feta, 45% Fett, 1 EL, 15g", c: "Käse", p: 1 },
  { n: "Schmelzkäse, 30% Fett, 2 EL, 25g", c: "Käse", p: 1.5 },
  { n: "Schmelzkäse, 45% Fett, 2 EL, 25g", c: "Käse", p: 2 },
  { n: "Schmelzkäsescheiben, 20-25% Fett, 1 Scheibe", c: "Käse", p: 1 },
  { n: "Schnittkäse, 30% Fett, 1 Scheibe, 30g", c: "Käse", p: 2 },
  { n: "Schnittkäse, 45-48% Fett, 1 Scheibe, 30g", c: "Käse", p: 2.5 },
  { n: "Ziegenkäse, 45% Fett, 1 Scheibe, 30g", c: "Käse", p: 2 },
  // Knabbereien
  { n: "Brotchips, jede Sorte, 1 St., 5g", c: "Knabbereien", p: 0.5 },
  { n: "Chipsletten, 5 St., 8g", c: "Knabbereien", p: 1 },
  { n: "Erdnüsse, geröstet, 1TL, 5g", c: "Knabbereien", p: 1 },
  { n: "Erdnussflips, 1 Hand voll, 6g", c: "Knabbereien", p: 1 },
  { n: "Gebäckknusperstangen mit Käse, 1 St.", c: "Knabbereien", p: 1 },
  { n: "Grissini, Brotsticks, 1 St.", c: "Knabbereien", p: 0.5 },
  { n: "Kartoffelchips, 1 Hand voll, 15g", c: "Knabbereien", p: 2 },
  { n: "Knabbergebäck z.B. Party-Mix, 1 Hand voll", c: "Knabbereien", p: 0.5 },
  { n: "Kräcker, 5 St., 30g", c: "Knabbereien", p: 2 },
  { n: "Mandeln gebrannt, 1 kl. Portion, 50g", c: "Knabbereien", p: 6.5 },
  { n: "Popcorn, süß, fertig, 1 Hand voll, 5g", c: "Knabbereien", p: 0.5 },
  { n: "Salzbrezeln, 5 St., 10g", c: "Knabbereien", p: 0.5 },
  { n: "Salzstangen, 10 St., 10g", c: "Knabbereien", p: 0.5 },
  { n: "Studentenfutter, 1 EL, 12g", c: "Knabbereien", p: 1.5 },
  { n: "Vollkorn Dinkel Sesambrezeln, 5 St., 12g", c: "Knabbereien", p: 1 },
  { n: "Vollkorngebäckstangen, 3 St., 15g", c: "Knabbereien", p: 1 },
  // Nüsse & Samen
  { n: "Cashewnüsse, 5 St., 5g", c: "Nüsse & Samen", p: 1 },
  { n: "Erdnüsse, 1 EL, 10g", c: "Nüsse & Samen", p: 1.5 },
  { n: "Haselnüsse, 4 St., 5g", c: "Nüsse & Samen", p: 1 },
  { n: "Kokosnuss, frisch, 1 St., 50g", c: "Nüsse & Samen", p: 5 },
  { n: "Kürbiskerne, 1 EL, 10g", c: "Nüsse & Samen", p: 1.5 },
  { n: "Leinsamen, 1 TL, 5g", c: "Nüsse & Samen", p: 0.5 },
  { n: "Mandeln, 4 St., 5g", c: "Nüsse & Samen", p: 1 },
  { n: "Nüsse, gemahlen/gehackt, 1 TL, 5g", c: "Nüsse & Samen", p: 1 },
  { n: "Paranüsse, 1 St., 5g", c: "Nüsse & Samen", p: 1 },
  { n: "Pistazien, 7 St., 7g", c: "Nüsse & Samen", p: 1 },
  { n: "Sesam, 1 TL, 5g", c: "Nüsse & Samen", p: 0.5 },
  { n: "Sonnenblumenkerne, 1 TL, 5g", c: "Nüsse & Samen", p: 0.5 },
  { n: "Walnüsse, 1 St., 5g", c: "Nüsse & Samen", p: 1 }
];

// --- 3. HELPER FUNKTIONEN ---
const getLogicalDayInfo = (dateString = null) => {
  const d = dateString ? new Date(dateString) : new Date();
  if (d.getHours() < 3) d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;
  const startOfDay = new Date(year, d.getMonth(), d.getDate(), 3, 0, 0, 0);
  return { dateKey, startOfDay };
};

const formatDate = (dateString) => {
  const options = { weekday: 'long', day: '2-digit', month: 'long' };
  return new Date(dateString).toLocaleDateString('de-DE', options);
};

// TRICK: Wandelt JEDEN Benutzernamen in eine Firebase-kompatible Fake-Email um.
const usernameToFakeEmail = (uname) => {
  const lower = uname.trim().toLowerCase();
  let hex = '';
  for(let i=0; i<lower.length; i++) {
    hex += lower.charCodeAt(i).toString(16);
  }
  return `${hex}@pointtracker.local`;
};

export default function App() {
  // --- STATES ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Login Form States 
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  // Data States
  const [dbGlobalFoods, setDbGlobalFoods] = useState([]);
  const [customFoods, setCustomFoods] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // UI States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortOption, setSortOption] = useState('name_asc');
  const [selectedFood, setSelectedFood] = useState(null);
  const [editingFood, setEditingFood] = useState(null);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(30);

  const [showGoalCalculator, setShowGoalCalculator] = useState(false);
  const [goalData, setGoalData] = useState({ gender: '', age: '', weight: '', height: '', activity: '' });

  const [allProfiles, setAllProfiles] = useState([]);
  const [pendingUserChanges, setPendingUserChanges] = useState({});
  const [importStatus, setImportStatus] = useState(null); // 'loading', 'success', null

  const isAdmin = userProfile?.role === 'admin';

  // --- FIREBASE INITIALIZATION & AUTH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
    return () => unsubscribe();
  }, []);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!user) return;

    const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid);
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
        if (docSnap.data().dailyGoal) setDailyGoal(docSnap.data().dailyGoal);
      } else {
        const fallbackName = `Nutzer ${user.uid.substring(0,5)}`;
        const newProfile = { uid: user.uid, name: fallbackName, role: 'user', isDeleted: false, dailyGoal: 30 };
        setDoc(profileRef, newProfile);
        setUserProfile(newProfile);
      }
    });

    const unsubscribeGlobal = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'global_foods'), (snapshot) => {
      const fetched = [];
      snapshot.forEach(d => fetched.push({ id: d.id, ...d.data() }));
      setDbGlobalFoods(fetched);
    });

    const unsubscribeCustom = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'custom_foods'), (snapshot) => {
      const fetched = [];
      snapshot.forEach(d => fetched.push({ id: d.id, ...d.data(), isCustom: true }));
      setCustomFoods(fetched);
    });

    const unsubscribeLogs = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'logs'), (snapshot) => {
      const fetched = [];
      snapshot.forEach(d => fetched.push({ id: d.id, ...d.data() }));
      fetched.sort((a, b) => new Date(b.consumedAt) - new Date(a.consumedAt));
      setLogs(fetched);
    });

    return () => { unsubscribeProfile(); unsubscribeGlobal(); unsubscribeCustom(); unsubscribeLogs(); };
  }, [user]);

  // Admin: Alle User abfragen
  useEffect(() => {
    if (!user || !isAdmin) return;
    const unsubscribeAllProfiles = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'profiles'), (snapshot) => {
      const fetched = [];
      snapshot.forEach(d => fetched.push(d.data()));
      setAllProfiles(fetched);
    });
    return () => unsubscribeAllProfiles();
  }, [user, isAdmin]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // --- AUTHENTICATION ACTIONS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    if (!usernameInput.trim()) {
      setAuthError('Bitte gib einen Benutzernamen ein.');
      return;
    }

    const fakeEmail = usernameToFakeEmail(usernameInput);

    try {
      if (isRegistering) {
        const userCred = await createUserWithEmailAndPassword(auth, fakeEmail, password);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', userCred.user.uid), {
           uid: userCred.user.uid,
           name: usernameInput.trim(),
           role: 'user',
           isDeleted: false,
           dailyGoal: 30
        });
      } else {
        await signInWithEmailAndPassword(auth, fakeEmail, password);
      }
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setAuthError('Dieser Benutzername ist bereits vergeben.');
      else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') setAuthError('Falsches Passwort oder Benutzername existiert nicht.');
      else if (err.code === 'auth/weak-password') setAuthError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      else setAuthError('Ein Fehler ist aufgetreten: ' + err.message);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  // --- ADMIN: PDF IMPORT ---
  const handleImportPDF = async () => {
    if (!isAdmin) return;
    setImportStatus('loading');
    try {
      const batch = writeBatch(db);
      
      // Schleife durch die große PDF Liste und füge sie zum Batch hinzu
      fullPDFData.forEach((item, index) => {
        const foodRef = doc(db, 'artifacts', appId, 'public', 'data', 'global_foods', `pdf_full_${index}`);
        batch.set(foodRef, {
          name: item.n,
          category: item.c,
          points: item.p,
          isGlobal: true,
          isDeleted: false
        });
      });
      
      await batch.commit(); // Alles auf einmal in die Datenbank feuern
      
      setImportStatus('success');
      setTimeout(() => setImportStatus(null), 3000);
    } catch (err) {
      alert("Fehler beim Import: " + err.message);
      setImportStatus(null);
    }
  };


  // --- DATENVERARBEITUNG ---
  const allFoods = useMemo(() => {
    // Da wir jetzt alles aus der Datenbank holen, brauchen wir die Dummy-Liste nicht mehr
    let result = [...dbGlobalFoods.filter(f => !f.isDeleted)];
    return [...result, ...customFoods];
  }, [dbGlobalFoods, customFoods]);

  const allCategories = useMemo(() => {
    const cats = new Set(allFoods.map(f => f.category));
    return Array.from(cats).sort();
  }, [allFoods]);

  const filteredFoods = useMemo(() => {
    const searchTerms = search.toLowerCase().split(' ').filter(term => term !== '');
    let result = allFoods.filter((food) => {
      const searchableText = `${food.name} ${food.category}`.toLowerCase();
      const matchesSearch = searchTerms.every(term => searchableText.includes(term));
      const matchesCategory = selectedCategory ? food.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
      if (sortOption === 'name_desc') return b.name.localeCompare(a.name);
      if (sortOption === 'points_asc') return a.points - b.points;
      if (sortOption === 'points_desc') return b.points - a.points;
      return 0;
    });

    return result;
  }, [allFoods, search, selectedCategory, sortOption]);

  const { todayLogs, todayPoints, groupedHistory } = useMemo(() => {
    const { startOfDay } = getLogicalDayInfo();
    const todayL = [];
    const history = {};
    let tPoints = 0;

    logs.forEach(log => {
      const logDate = new Date(log.consumedAt);
      const { dateKey } = getLogicalDayInfo(log.consumedAt);
      if (logDate >= startOfDay) {
        todayL.push(log);
        tPoints += log.points;
      }
      if (!history[dateKey]) history[dateKey] = { points: 0, logs: [] };
      history[dateKey].points += log.points;
      history[dateKey].logs.push(log);
    });

    const historyArray = Object.keys(history)
      .sort((a, b) => new Date(b) - new Date(a))
      .map(dateKey => ({ dateKey, dateFormatted: formatDate(dateKey), ...history[dateKey] }));

    return { todayLogs: todayL, todayPoints: tPoints, groupedHistory: historyArray };
  }, [logs]);

  // --- ACTIONS ---
  const handleAddLog = async (food, multiplier = 1) => {
    if (!user) return;
    try {
      const logEntry = {
        foodId: food.id, name: food.name, category: food.category,
        points: food.points * multiplier, multiplier: multiplier,
        consumedAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'logs'), logEntry);
      setSelectedFood(null);
      setActiveTab('dashboard');
    } catch (e) { console.error("Error adding log", e); }
  };

  const handleDeleteLog = async (logId) => {
    if (!user) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'logs', logId)); } 
    catch (e) { console.error("Error", e); }
  };

  const handleSaveFood = async (e) => {
    e.preventDefault();
    if (!user || !editingFood) return;
    
    try {
      if (editingFood.isCustom) {
        const foodRef = doc(db, 'artifacts', appId, 'users', user.uid, 'custom_foods', editingFood.id || Date.now().toString());
        await setDoc(foodRef, {
          name: editingFood.name, category: editingFood.category,
          kcal: Number(editingFood.kcal) || 0, fett: Number(editingFood.fett) || 0,
          points: parseFloat(editingFood.points)
        });
      } else if (isAdmin) {
        const foodRef = doc(db, 'artifacts', appId, 'public', 'data', 'global_foods', editingFood.id);
        await setDoc(foodRef, {
          name: editingFood.name, category: editingFood.category,
          kcal: Number(editingFood.kcal) || 0, fett: Number(editingFood.fett) || 0,
          points: parseFloat(editingFood.points), isGlobal: true
        });
      }
      setEditingFood(null);
    } catch (err) { console.error("Error saving food", err); }
  };

  const handleDeleteFood = async () => {
    if (!user || !editingFood) return;
    try {
      if (editingFood.isCustom) {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'custom_foods', editingFood.id));
      } else if (isAdmin) {
        const foodRef = doc(db, 'artifacts', appId, 'public', 'data', 'global_foods', editingFood.id);
        await setDoc(foodRef, { isDeleted: true }, { merge: true });
      }
      setEditingFood(null);
    } catch (err) { console.error("Error deleting food", err); }
  };

  const saveDailyGoalToDB = async (newGoal) => {
    setDailyGoal(newGoal);
    if(user) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid), { dailyGoal: newGoal }, { merge: true });
  };

  const calculateGoal = () => {
    let sum = 0;
    if (goalData.gender === 'W') sum += 7; else if (goalData.gender === 'M') sum += 15;
    if (goalData.age === '17-26') sum += 4; else if (goalData.age === '27-36') sum += 3; else if (goalData.age === '37-47') sum += 2; else if (goalData.age === '48-58') sum += 1;
    if (goalData.weight) sum += Math.floor(Number(goalData.weight) / 10);
    if (goalData.height === '<1.60') sum += 1; else if (goalData.height === '>=1.60') sum += 2;
    if (goalData.activity === '0') sum += 0; else if (goalData.activity === '2') sum += 2; else if (goalData.activity === '4') sum += 4; else if (goalData.activity === '6') sum += 6;
    saveDailyGoalToDB(sum || 30);
    setShowGoalCalculator(false);
  };

  const handleAdminUserChange = (uid, field, value) => {
    setPendingUserChanges(prev => ({ ...prev, [uid]: { ...prev[uid], [field]: value } }));
  };

  const saveAdminUserChanges = async () => {
    const promises = Object.entries(pendingUserChanges).map(([uid, changes]) => {
      return setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', uid), changes, { merge: true });
    });
    await Promise.all(promises);
    setPendingUserChanges({});
    alert("Änderungen erfolgreich gespeichert!");
  };

  const handleFoodCalcChange = (field, value) => {
    const newFood = { ...editingFood, [field]: value };
    const kcal = Number(newFood.kcal) || 0;
    const fett = Number(newFood.fett) || 0;
    if (kcal > 0 || fett > 0) {
      const p = (kcal / 60) + (fett / 9);
      newFood.points = Math.round(p * 2) / 2;
    }
    setEditingFood(newFood);
  };

  // --- RENDER SCREENS ---

  if (authLoading) {
    return <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!user) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-black' : 'bg-[#F2F2F7]'} font-sans flex items-center justify-center p-4`}>
        <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
              <Utensils className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PointTracker</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">{isRegistering ? 'Erstelle einen Account' : 'Willkommen zurück'}</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authError && <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-xl text-center font-medium">{authError}</div>}
            
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" required placeholder="Benutzername"
                value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="password" required placeholder="Passwort"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3.5 rounded-2xl font-bold transition-all shadow-md active:scale-95 mt-2">
              {isRegistering ? 'Registrieren' : 'Einloggen'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); setUsernameInput(''); setPassword(''); }}
              className="text-sm font-medium text-blue-500 hover:text-blue-600"
            >
              {isRegistering ? 'Bereits registriert? Einloggen' : 'Neu hier? Account erstellen'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (userProfile?.isDeleted) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex items-center justify-center p-6 text-center">
        <div className="bg-white dark:bg-[#1C1C1E] p-8 rounded-3xl shadow-xl max-w-sm w-full">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account gesperrt</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Dein Account wurde von einem Administrator deaktiviert.</p>
          <button onClick={handleLogout} className="px-6 py-2 bg-gray-200 dark:bg-[#2C2C2E] text-gray-900 dark:text-white rounded-xl font-bold">Abmelden</button>
        </div>
      </div>
    );
  }

  // --- MAIN APP VIEWS ---

  const renderDashboard = () => {
    const progress = Math.min((todayPoints / dailyGoal) * 100, 100);
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <h1 className="text-3xl font-bold px-4 pt-4 text-gray-900 dark:text-white">Heute</h1>
        
        <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-sm mx-4 relative">
          <div className="relative flex items-center justify-center w-40 h-40">
            <svg className="transform -rotate-90 w-40 h-40">
              <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100 dark:text-gray-800" />
              <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-blue-500 transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-bold text-gray-900 dark:text-white tracking-tighter">
                {todayPoints.toString().replace('.', ',')}
              </span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                von {dailyGoal} P.
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 pb-24">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Gegessen</h2>
          {todayLogs.length === 0 ? (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-8 text-center shadow-sm mb-4">
              <PieChart className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Noch keine Einträge heute.</p>
            </div>
          ) : (
            <ul className="space-y-3 mb-4">
              {todayLogs.map(log => (
                <li key={log.id} className="flex justify-between items-center bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-sm group">
                  <div className="flex-1">
                    <p className="font-semibold text-[17px] text-gray-900 dark:text-white">{log.name}</p>
                    <p className="text-[14px] text-gray-500">{log.multiplier}x Portion</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-blue-500">{log.points.toString().replace('.', ',')}</span>
                    <button onClick={() => handleDeleteLog(log.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setActiveTab('search')} className="w-full py-4 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl font-semibold flex justify-center items-center gap-2 transition-colors">
            <Plus size={20} /> Lebensmittel hinzufügen
          </button>
        </div>
      </div>
    );
  };

  const renderSearch = () => (
    <div className="space-y-4 animate-in fade-in duration-500 px-4 pt-4 pb-24 h-full flex flex-col">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Suchen</h1>
      
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-sm shrink-0">
        <Search size={20} className="text-gray-400" />
        <input type="text" placeholder="Lebensmittel suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent outline-none text-[17px] text-gray-900 dark:text-white placeholder-gray-400" />
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 pt-1 shrink-0">
        <div className="flex items-center bg-white dark:bg-[#1C1C1E] rounded-full px-3 py-1.5 border border-gray-200 dark:border-gray-800 shrink-0">
          <ArrowUpDown size={14} className="text-gray-400 mr-2" />
          <select 
            value={sortOption} 
            onChange={e => setSortOption(e.target.value)}
            className="bg-transparent text-sm text-gray-600 dark:text-gray-300 outline-none appearance-none pr-4"
          >
            <option value="name_asc" className="text-black dark:bg-[#1C1C1E] dark:text-white">A - Z</option>
            <option value="name_desc" className="text-black dark:bg-[#1C1C1E] dark:text-white">Z - A</option>
            <option value="points_asc" className="text-black dark:bg-[#1C1C1E] dark:text-white">Punkte aufsteigend</option>
            <option value="points_desc" className="text-black dark:bg-[#1C1C1E] dark:text-white">Punkte absteigend</option>
          </select>
        </div>

        <button onClick={() => setSelectedCategory('')} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${!selectedCategory ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-black' : 'bg-white dark:bg-[#1C1C1E] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800'}`}>
          Alle
        </button>
        {allCategories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-black' : 'bg-white dark:bg-[#1C1C1E] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-sm">
        {filteredFoods.length > 0 ? (
          <ul className="divide-y divide-gray-100 dark:divide-[#2C2C2E]">
            {filteredFoods.map((food) => (
              <li key={food.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors cursor-pointer group">
                <div className="flex-1 flex items-start gap-4" onClick={() => setSelectedFood(food)}>
                  <div className="mt-1 p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 shrink-0">
                    <Utensils size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[17px] text-gray-900 dark:text-white leading-tight">{food.name}</p>
                      {food.isCustom && <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full font-medium shrink-0">Eigenes</span>}
                    </div>
                    <p className="text-[14px] text-gray-500 mt-1">{food.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {(isAdmin || food.isCustom) && (
                    <button onClick={(e) => { e.stopPropagation(); setEditingFood(food); setShowNewCategoryInput(!allCategories.includes(food.category)); }} className="p-2 text-gray-400 hover:text-gray-800 dark:hover:text-white">
                      <Edit2 size={18} />
                    </button>
                  )}
                  <div onClick={() => setSelectedFood(food)} className="flex items-center justify-center bg-gray-100 dark:bg-[#2C2C2E] text-gray-900 dark:text-gray-300 px-3 py-1.5 rounded-xl font-semibold min-w-[3.5rem]">
                    {food.points.toString().replace('.', ',')}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-10 text-center text-gray-500">Nichts gefunden. Du kannst im Profil eigene Lebensmittel anlegen!</div>
        )}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-6 animate-in fade-in duration-500 px-4 pt-4 pb-24">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Historie</h1>
      {groupedHistory.length === 0 ? (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 text-center shadow-sm">
          <Clock className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Deine Historie ist noch leer.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedHistory.map(day => (
            <div key={day.dateKey} className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                <h3 className="font-bold text-[18px] text-gray-900 dark:text-white">{day.dateFormatted}</h3>
                <span className={`font-bold px-3 py-1 rounded-full text-sm ${day.points > dailyGoal ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                  {day.points.toString().replace('.', ',')} P.
                </span>
              </div>
              <ul className="space-y-2">
                {day.logs.map(log => (
                  <li key={log.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{log.multiplier}x {log.name}</span>
                    <span className="text-gray-900 dark:text-gray-300 font-medium">{log.points}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6 animate-in fade-in duration-500 px-4 pt-4 pb-24">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profil</h1>

      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Moon className="text-gray-400" size={20} />
            <span className="font-medium text-gray-900 dark:text-white">Dark-Mode</span>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-14 h-8 bg-gray-200 dark:bg-[#2C2C2E] rounded-full relative transition-colors">
            <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${isDarkMode ? 'translate-x-7 bg-blue-500' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Calculator className="text-gray-400" size={20} />
            <span className="font-medium text-gray-900 dark:text-white">Mein Tagesziel</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-blue-500">{dailyGoal} P.</span>
            <button onClick={() => setShowGoalCalculator(true)} className="px-3 py-1.5 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300">Neu berechnen</button>
          </div>
        </div>
      </div>

      <button onClick={() => { setEditingFood({ id: '', name: '', category: '', kcal: '', fett: '', points: 0, isCustom: true }); setShowNewCategoryInput(false); }} className="w-full bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl"><Plus size={20} /></div>
          <span className="font-medium text-[17px] text-gray-900 dark:text-white">Eigenes Lebensmittel anlegen</span>
        </div>
        <ChevronRight className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
      </button>

      <button onClick={handleLogout} className="w-full bg-red-50 dark:bg-red-900/10 p-4 rounded-3xl shadow-sm flex items-center justify-center gap-3 group active:scale-[0.98] transition-all mt-4">
        <LogOut size={20} className="text-red-500" />
        <span className="font-bold text-[17px] text-red-500">Abmelden</span>
      </button>

      <div className="text-center mt-8">
        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">PointTracker v3.0</p>
        <p className="text-xs text-gray-400 mt-1">
          Nutzer: <span className="font-bold">{userProfile?.name}</span> {isAdmin && '(Admin)'}
        </p>
      </div>
    </div>
  );

  const renderAdminUsers = () => (
    <div className="space-y-6 animate-in fade-in duration-500 px-4 pt-4 pb-24">
      
      {/* 1. PDF IMPORT SEKTION (NEU) */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Bereich</h1>
      
      <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-gray-900 dark:text-white">
           <Database className="text-blue-500" />
           <h2 className="text-xl font-bold">PDF-Datenbank</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Lade alle ~180 Lebensmittel aus der PDF in die globale Liste hoch.</p>
        <button 
          onClick={handleImportPDF}
          disabled={importStatus === 'loading' || importStatus === 'success'}
          className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-3 ${importStatus === 'loading' ? 'bg-gray-400' : importStatus === 'success' ? 'bg-green-500' : 'bg-blue-500 shadow-lg shadow-blue-500/20 active:scale-95'}`}
        >
          {importStatus === 'loading' ? 'Wird importiert...' : importStatus === 'success' ? 'Erfolgreich geladen!' : 'PDF-Daten importieren'}
          {importStatus === 'success' && <CheckCircle2 size={20} />}
        </button>
      </div>

      {/* 2. NUTZER VERWALTUNG */}
      <div className="flex justify-between items-center mt-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nutzer</h2>
        {Object.keys(pendingUserChanges).length > 0 && (
          <button onClick={saveAdminUserChanges} className="px-4 py-2 bg-blue-500 text-white rounded-xl font-bold shadow-md active:scale-95 transition-all">Speichern</button>
        )}
      </div>
      <div className="space-y-3">
        {allProfiles.map(p => {
          const isPendingDelete = pendingUserChanges[p.uid]?.isDeleted ?? p.isDeleted;
          const currentRole = pendingUserChanges[p.uid]?.role ?? p.role;
          return (
            <div key={p.uid} className={`bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm border-2 transition-colors ${isPendingDelete ? 'border-red-500/50 opacity-60' : 'border-transparent'}`}>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{p.name || 'Unbekannt'}</p>
                  <p className="text-xs text-gray-500 font-mono">ID: {p.uid}</p>
                </div>
                {p.uid === user.uid && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-lg font-bold">Du</span>}
              </div>
              <div className="flex gap-2">
                <select disabled={p.uid === user.uid} value={currentRole} onChange={(e) => handleAdminUserChange(p.uid, 'role', e.target.value)} className="flex-1 bg-gray-50 dark:bg-[#2C2C2E] text-sm text-gray-900 dark:text-white rounded-xl px-3 py-2 outline-none">
                  <option value="user" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">User</option>
                  <option value="admin" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Admin</option>
                </select>
                <button disabled={p.uid === user.uid} onClick={() => handleAdminUserChange(p.uid, 'isDeleted', !isPendingDelete)} className={`px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors ${isPendingDelete ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
                  {isPendingDelete ? 'Gesperrt' : 'Sperren'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 bg-[#F2F2F7] dark:bg-black font-sans selection:bg-blue-500/30`}>
      <div className="max-w-md mx-auto h-screen relative shadow-2xl bg-[#F2F2F7] dark:bg-black overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto hide-scrollbar relative">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'search' && renderSearch()}
          {activeTab === 'history' && renderHistory()}
          {activeTab === 'profile' && renderProfile()}
          {activeTab === 'users' && isAdmin && renderAdminUsers()}
        </div>

        <div className="absolute bottom-0 w-full bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 pb-safe pt-2 px-4 flex justify-around items-center z-40">
          {[
            { id: 'dashboard', icon: Home, label: 'Heute' },
            { id: 'search', icon: Search, label: 'Suche' },
            { id: 'history', icon: Clock, label: 'Historie' },
            { id: 'profile', icon: User, label: 'Profil' },
            ...(isAdmin ? [{ id: 'users', icon: Users, label: 'Admin' }] : [])
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center p-2 transition-all ${activeTab === item.id ? 'text-blue-500 scale-110' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-semibold">{item.label}</span>
            </button>
          ))}
        </div>

        {selectedFood && (
          <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
            <div className="w-full sm:w-11/12 max-w-sm bg-white dark:bg-[#1C1C1E] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-full sm:fade-in duration-300">
              <div className="p-6 relative">
                <button onClick={() => setSelectedFood(null)} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-full text-gray-500"><X size={20} /></button>
                <div className="mt-2 mb-6 text-center">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{selectedFood.name}</h3>
                  <p className="text-gray-500 mt-1">{selectedFood.category} • {selectedFood.points.toString().replace('.', ',')} P.</p>
                </div>
                <div className="space-y-4">
                  <button onClick={() => handleAddLog(selectedFood, 0.5)} className="w-full py-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl font-semibold text-gray-900 dark:text-white flex justify-between px-6">
                    <span>Halbe Portion (0,5x)</span>
                    <span className="text-blue-500">{(selectedFood.points * 0.5).toString().replace('.', ',')} P.</span>
                  </button>
                  <button onClick={() => handleAddLog(selectedFood, 1)} className="w-full py-4 bg-blue-500 text-white shadow-lg shadow-blue-500/30 rounded-2xl font-bold flex justify-between px-6">
                    <span>Normale Portion (1x)</span>
                    <span>{selectedFood.points.toString().replace('.', ',')} P.</span>
                  </button>
                  <button onClick={() => handleAddLog(selectedFood, 2)} className="w-full py-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl font-semibold text-gray-900 dark:text-white flex justify-between px-6">
                    <span>Doppelte Portion (2x)</span>
                    <span className="text-blue-500">{(selectedFood.points * 2).toString().replace('.', ',')} P.</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingFood && (
          <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full sm:w-11/12 max-w-sm bg-white dark:bg-[#1C1C1E] rounded-t-3xl sm:rounded-3xl shadow-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editingFood.id ? 'Bearbeiten' : 'Neu anlegen'}</h3>
                <div className="flex gap-2">
                  {editingFood.id && <button onClick={handleDeleteFood} className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-500"><Trash2 size={20} /></button>}
                  <button onClick={() => setEditingFood(null)} className="p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-full text-gray-500"><X size={20} /></button>
                </div>
              </div>
              <form onSubmit={handleSaveFood} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-600 dark:text-gray-400 ml-1">Name & Menge</label>
                  <input type="text" required value={editingFood.name} onChange={e => setEditingFood({...editingFood, name: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white border-2 border-transparent focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-600 dark:text-gray-400 ml-1">Kategorie</label>
                  {showNewCategoryInput ? (
                    <div className="flex gap-2">
                      <input type="text" required autoFocus placeholder="Neue Kategorie..." value={editingFood.category} onChange={e => setEditingFood({...editingFood, category: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white border-2 border-transparent focus:border-blue-500 outline-none" />
                      <button type="button" onClick={() => setShowNewCategoryInput(false)} className="px-4 bg-gray-200 dark:bg-[#2C2C2E] rounded-2xl text-gray-600 dark:text-gray-300"><X size={20} /></button>
                    </div>
                  ) : (
                    <div className="relative">
                      <select required value={editingFood.category} onChange={(e) => { if (e.target.value === '___NEW___') { setShowNewCategoryInput(true); setEditingFood({...editingFood, category: ''}); } else setEditingFood({...editingFood, category: e.target.value}); }} className={`w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] border-2 border-transparent focus:border-blue-500 outline-none appearance-none ${!editingFood.category ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        <option value="" disabled className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Bitte wählen...</option>
                        {allCategories.map(cat => <option key={cat} value={cat} className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">{cat}</option>)}
                        <option value="___NEW___" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">+ Neue Kategorie erstellen...</option>
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90" size={18} />
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1.5 text-gray-600 dark:text-gray-400 ml-1">Kalorien (kcal)</label>
                    <input type="number" required={!editingFood.id} value={editingFood.kcal || ''} onChange={e => handleFoodCalcChange('kcal', e.target.value)} placeholder="0" className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white border-2 border-transparent focus:border-blue-500 outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1.5 text-gray-600 dark:text-gray-400 ml-1">Fett (g)</label>
                    <input type="number" step="0.1" required={!editingFood.id} value={editingFood.fett || ''} onChange={e => handleFoodCalcChange('fett', e.target.value)} placeholder="0" className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white border-2 border-transparent focus:border-blue-500 outline-none" />
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 flex justify-between items-center mt-2 border border-blue-100 dark:border-blue-900/50">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">Punkte gesamt:</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{editingFood.points.toString().replace('.', ',')}</span>
                </div>
                <button type="submit" className="w-full mt-6 flex items-center justify-center gap-2 bg-blue-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 active:scale-[0.98]">
                  <Save size={20} /> Speichern
                </button>
              </form>
            </div>
          </div>
        )}

        {showGoalCalculator && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Punkte-Quiz</h3>
                <button onClick={() => setShowGoalCalculator(false)} className="p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-full text-gray-500"><X size={20} /></button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block font-bold mb-2 text-gray-900 dark:text-white">A. Geschlecht</label>
                  <select value={goalData.gender} onChange={e => setGoalData({...goalData, gender: e.target.value})} className="w-full bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 outline-none appearance-none">
                    <option value="" disabled className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Wählen...</option>
                    <option value="W" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Weiblich</option>
                    <option value="M" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Männlich</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-2 text-gray-900 dark:text-white">B. Alter</label>
                  <select value={goalData.age} onChange={e => setGoalData({...goalData, age: e.target.value})} className="w-full bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 outline-none appearance-none">
                    <option value="" disabled className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Wählen...</option>
                    <option value="17-26" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">17–26 Jahre</option>
                    <option value="27-36" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">27–36 Jahre</option>
                    <option value="37-47" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">37–47 Jahre</option>
                    <option value="48-58" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">48–58 Jahre</option>
                    <option value=">58" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Über 58 Jahre</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-2 text-gray-900 dark:text-white">C. Gewicht (in kg)</label>
                  <input type="number" value={goalData.weight} onChange={e => setGoalData({...goalData, weight: e.target.value})} placeholder="z.B. 84" className="w-full bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 outline-none" />
                </div>
                <div>
                  <label className="block font-bold mb-2 text-gray-900 dark:text-white">D. Körpergröße</label>
                  <select value={goalData.height} onChange={e => setGoalData({...goalData, height: e.target.value})} className="w-full bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 outline-none appearance-none">
                    <option value="" disabled className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Wählen...</option>
                    <option value="<1.60" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Unter 1,60 m</option>
                    <option value=">=1.60" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">1,60 m oder größer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-2 text-gray-900 dark:text-white">E. Aktivität (Alltag)</label>
                  <select value={goalData.activity} onChange={e => setGoalData({...goalData, activity: e.target.value})} className="w-full bg-gray-50 dark:bg-[#2C2C2E] text-gray-900 dark:text-white p-3 rounded-xl border border-gray-200 dark:border-gray-700 outline-none appearance-none">
                    <option value="" disabled className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Wählen...</option>
                    <option value="0" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Hauptsächlich sitzend</option>
                    <option value="2" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Hauptsächlich stehend</option>
                    <option value="4" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Gehend / Körperlich anstrengend</option>
                    <option value="6" className="bg-white text-black dark:bg-[#1C1C1E] dark:text-white">Sehr anstrengende körperliche Arbeit</option>
                  </select>
                </div>
                <button onClick={calculateGoal} disabled={!goalData.gender || !goalData.age || !goalData.weight || !goalData.height || !goalData.activity} className="w-full mt-4 flex justify-center items-center gap-2 bg-blue-500 disabled:bg-blue-300 text-white py-4 rounded-2xl font-bold transition-all active:scale-95">
                  Tagesziel festlegen
                </button>
              </div>
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .pb-safe { padding-bottom: calc(1rem + env(safe-area-inset-bottom)); }
        `}} />
      </div>
    </div>
  );
}