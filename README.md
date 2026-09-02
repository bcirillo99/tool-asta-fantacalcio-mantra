# 🏟️ DraftMantra — Gestore Asta Fantacalcio Mantra

Tool web per **gestire l'asta del Fantacalcio (modalità Mantra)**.

Nessuna AI, nessun consiglio automatico, **l'asta si fa da soli!!!!!!**.

Serve solo a
**inserire i giocatori che compri durante l'asta** e vedere **in tempo
reale come schierarli** nei vari moduli.

## A cosa serve

Durante l'asta tieni traccia di:

- chi hai comprato e a quanto (crediti spesi / rimasti).
- come si dispone la tua rosa sul campo con i diversi moduli.
- quali reparti sono ancora scoperti, così sai su chi puntare.

## Dati: da dove prenderli

Serve la lista giocatori. Scaricala **gratis** da
[fantacalcio.it](https://www.fantacalcio.it): dalla home clicca **App** →
**FantaAsta Live** → **Calciatori Serie A**, poi scarica il file
`Lista-FantaAsta-Fantacalcio.csv`.

Link diretto: <https://www.fantacalcio.it/app-fantaasta>

Il tool legge il CSV della Lista così com'è: contiene nome, ruoli Mantra,
squadra, quotazione e fantavalore — tutto ciò che serve.

> In alternativa il tool accetta anche un CSV **arricchito** (con intestazioni
> tipo `Nome`, `RM`, `QtA_M`, `FVM_M`, statistiche, rigoristi): se lo carichi,
> vengono usate anche quelle informazioni extra.

## Come aprirla

Due modi, scegli tu:

- **Online (niente da scaricare):** apri il link di GitHub Pages e parte nel
  browser → <https://bcirillo99.github.io/tool-asta-fantacalcio-mantra/>
- **Offline (asta in cantina senza WiFi):** scarica il progetto (bottone verde
  **Code → Download ZIP**), estrai, e fai doppio click su `index.html`.
  Funziona tutto in locale, PapaParse incluso: **zero internet**.

In entrambi i casi nessuna installazione, nessun `npm`, nessun server.

## Come si usa

1. Apri l'app (via link Pages o `index.html`, vedi sopra).
2. Clicca **Carica file** e seleziona `Lista-FantaAsta-Fantacalcio.csv`.
3. Imposta il **budget**: nella barra crediti clicca sul numero sotto
   **"Budget"** (quello con la riga tratteggiata) e digita i tuoi crediti
   totali. Default 500 FM.
4. Durante l'asta: **cerca** il giocatore, inserisci il **prezzo pagato**,
   **Aggiungi**. Crediti rimasti, spesi, giocatori di movimento e portieri si
   aggiornano da soli, con barra che mostra quanto budget hai già bruciato.
5. Scegli il **modulo** in alto a destra: la rosa si dispone in automatico
   sul campo, mettendo i migliori in campo (in base alla Qt.A) e il resto in panchina.
6. A fine asta, **Esporta squadra CSV** per salvare la rosa.

## Come funziona lo schieramento

Ogni giocatore viene messo nel **ruolo più difensivo** che il modulo
consente. Esempio: un multiruolo **C/T** occupa di default lo slot da **C**,
non quello da T.

Per ogni multiruolo puoi comunque **forzare a mano il ruolo** con cui vuoi
schierarlo, tramite il menu a tendina accanto al giocatore nell'elenco.

Chi non entra in nessuno slot del modulo finisce nella fascia **"Senza slot"**
in fondo al campo, evidenziato in rosso e con un contatore: così vedi a colpo
d'occhio quanti giocatori non riesci a schierare col modulo scelto.

### Toggle "Copri slot vuoti"

- **Spento** (default): ogni polivalente resta nel ruolo più difensivo.
- **Acceso**: i polivalenti vengono spinti in avanti per coprire gli slot
  offensivi rimasti vuoti.

## Note

- Tutto gira **in locale nel browser**. Nessun dato viene inviato online.
- Ruoli Mantra: Por, Dc, B, Dd, Ds, E, M, C, W, T, A, Pc.
- Moduli disponibili: 3-4-3, 3-4-1-2, 3-4-2-1, 3-5-2, 3-5-1-1, 4-3-3,
  4-3-1-2, 4-4-2, 4-1-4-1, 4-4-1-1, 4-2-3-1.
