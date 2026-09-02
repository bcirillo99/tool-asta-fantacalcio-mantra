# ⚽ Fantacalcio Mantra 26/27 — Gestore Asta

Tool web per **gestire l'asta del Fantacalcio (modalità Mantra)**.

Nessuna AI, nessun consiglio automatico, nessun server. Serve solo a
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

> Il file `riassuntivo_asta_2627.csv` presente nel repo è una versione
> arricchita (con statistiche stagione precedente e rigoristi) generata
> dagli script Python. Opzionale: se lo carichi, vedrai anche quelle info.

## Come si usa

1. Apri `webapp/index.html` nel browser (doppio click, nessuna installazione).
2. Clicca **Carica file** e seleziona `Lista-FantaAsta-Fantacalcio.csv`.
3. Imposta il **budget** (default 500 FM).
4. Durante l'asta: **cerca** il giocatore, inserisci il **prezzo pagato**,
   **Aggiungi**. Budget e conteggi si aggiornano da soli.
5. Scegli il **modulo** in alto a destra: la rosa si dispone in automatico
   sul campo, mettendo i migliori in campo (in base alla QT.A) e il resto in panchina.
6. A fine asta, **Esporta squadra CSV** per salvare la rosa.

## Come funziona lo schieramento

Ogni giocatore viene messo nel **ruolo più difensivo** che il modulo
consente. Esempio: un multiruolo **C/T** occupa di default lo slot da **C**,
non quello da T.

Per ogni multiruolo puoi comunque **forzare a mano il ruolo** con cui vuoi
schierarlo, tramite il menu a tendina accanto al giocatore nell'elenco.

### Opzione "Riempi buchi"

- **Spento** (default): ogni polivalente resta nel ruolo più difensivo.
- **Acceso**: i polivalenti vengono spinti in avanti per coprire slot
  offensivi vuoti.

## Note

- Tutto gira **in locale nel browser**. Nessun dato viene inviato online.
- Ruoli Mantra: Por, Dc, B, Dd, Ds, E, M, C, W, T, A, Pc.
- Moduli disponibili: 3-4-3, 3-4-1-2, 3-4-2-1, 3-5-2, 3-5-1-1, 4-3-3,
  4-3-1-2, 4-4-2, 4-1-4-1, 4-4-1-1, 4-2-3-1.
