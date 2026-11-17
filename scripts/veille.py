"""Revue de presse quotidienne de la 3e circonscription de l'Essonne.

Interroge le flux Google Actualités pour chacune des 47 communes, fusionne avec
les articles déjà connus, classe par thème et écrit data/presse.json.
Seuls le titre, la source, la date et le lien sont conservés.
Lancé chaque matin par .github/workflows/site.yml ; utilisable à la main :
    python3 scripts/veille.py
"""
import datetime as dt
import email.utils
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "presse.json"
JOURS = 30          # on garde un mois d'articles
MAX = 800

THEMES = {
    "Transports": ["rer", "transilien", "sncf", "gare", "bus", "train", "route", "rn20", "n20", "voirie", "circulation", "velo", "mobilite", "trafic", "travaux"],
    "Sécurité": ["police", "gendarm", "vol ", "cambriol", "agression", "incendie", "pompier", "accident", "interpell", "delinqu", "securite", "rixe", "drogue", "stupefiant", "proces", "tribunal"],
    "Éducation": ["ecole", "college", "lycee", "eleve", "enseign", "rentree", "creche", "periscolaire", "cantine", "etudiant"],
    "Santé": ["sante", "medecin", "hopital", "pharmac", "clinique", "urgence", "maison de sante", "soin", "ars "],
    "Environnement": ["environnement", "ecolog", "climat", "inondation", "crue", "biodiversit", "foret", "dechet", "pollution", "renov", "energie", "solaire", "eau "],
    "Économie": ["entreprise", "emploi", "commerce", "zone d'activite", "industri", "agricult", "agriculteur", "ferme", "chomage", "usine", "magasin", "economi", "base 217", "startup", "recrut"],
    "Urbanisme": ["logement", "urbanisme", "immobilier", "construction", "chantier", "quartier", "permis de construire", "plan local d'urbanisme", "amenagement", "lotissement"],
    "Culture & sport": ["festival", "concert", "spectacle", "musee", "expo", "theatre", "cinema", "bibliotheque", "sport", "football", "rugby", "basket", "handball", "trail", "marathon", "club", "chateau", "patrimoine"],
}

UA = "Mozilla/5.0 (compatible; revue-presse-alexisizard/1.0)"

# Noms portés aussi par d'autres communes ou des personnes : on exige « Essonne » dans la recherche
AMBIGUES = {"Lardy", "Torfou", "Saint-Yon", "Sermaise", "Avrainville", "Breuillet", "Roinville",
            "Saint-Vrain", "Égly", "Mauchamps", "Mérobert", "Richarville", "Corbreuse", "Arpajon"}
# Titres à écarter (homonymes, pages automatiques sans intérêt)
EXCLUS = re.compile(r"arpajon-sur-cere|cantal|qualite de l'air|\biqa\b|dette de |\bvs\b|meteo|horaires? d|prix de l'immobilier|code postal|carburants|federale 2")
SOURCES_EXCLUES = {"journaldunet.com", "Fédération Française de Handball", "L'Internaute", "Meteo-France"}


def norm(s):
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


def cle(titre):
    return re.sub(r"[^a-z0-9]+", " ", norm(titre)).strip()[:90]


MOTIFS_THEMES = {nom: re.compile(r"\b(" + "|".join(re.escape(m.strip()) for m in mots) + ")")
                 for nom, mots in THEMES.items()}


def themes(titre):
    t = norm(titre)
    out = [nom for nom, m in MOTIFS_THEMES.items() if m.search(t)]
    return out or ["Vie locale"]


def flux(commune, essonne=True):
    q = f'"{commune}"' + (" Essonne" if essonne else "") + " when:30d"
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": q, "hl": "fr", "gl": "FR", "ceid": "FR:fr"})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for essai in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return ET.fromstring(r.read())
        except urllib.error.HTTPError as e:
            if e.code != 429 or essai == 2:
                raise
            time.sleep(30 * (essai + 1))  # trop de requêtes : on patiente


def main():
    communes = [c["nom"] for c in json.loads((RACINE / "data" / "communes.json").read_text("utf-8"))["communes"]]
    motifs = {c: re.compile(r"\b" + re.escape(norm(c)).replace(r"\-", "[- ]") + r"\b") for c in communes}
    maintenant = dt.datetime.now(dt.timezone.utc)
    limite = maintenant - dt.timedelta(days=JOURS)

    connus = {}
    if SORTIE.exists():
        for a in json.loads(SORTIE.read_text("utf-8")).get("articles", []):
            connus[cle(a["t"])] = a

    erreurs = 0
    par_longueur = sorted(communes, key=len, reverse=True)

    def citees(tn):
        trouve = []
        for c in par_longueur:  # les noms longs d'abord (Saint-Germain-lès-Arpajon avant Arpajon)
            m = motifs[c].search(tn)
            if m:
                trouve.append(c)
                tn = tn[: m.start()] + " " * (m.end() - m.start()) + tn[m.end():]
        return trouve

    requetes = [(c, True) for c in communes] + [(c, False) for c in communes if c not in AMBIGUES]
    for commune, essonne in requetes:
        try:
            racine = flux(commune, essonne)
        except Exception as e:  # réseau, quota…
            erreurs += 1
            print(f"! {commune} : {e}")
            continue
        for item in racine.iter("item"):
            titre = (item.findtext("title") or "").strip()
            source = (item.findtext("source") or "").strip()
            if source and titre.endswith(" - " + source):
                titre = titre[: -len(source) - 3].strip()
            lien = (item.findtext("link") or "").strip()
            try:
                date = email.utils.parsedate_to_datetime(item.findtext("pubDate"))
            except Exception:
                continue
            if not titre or not lien or date < limite:
                continue
            if source in SOURCES_EXCLUES or EXCLUS.search(norm(titre)):
                continue
            k = cle(titre)
            cites = citees(norm(titre))
            if not essonne and commune not in cites:
                continue  # recherche large : le nom doit figurer dans le titre
            if commune not in cites:
                cites.insert(0, commune)
            if k in connus:
                for c in cites:
                    if c not in connus[k]["c"]:
                        connus[k]["c"].append(c)
                continue
            connus[k] = {"t": titre, "u": lien, "s": source or "Presse", "d": date.isoformat(),
                         "c": cites, "th": themes(titre)}
        time.sleep(0.8)

    articles = [a for a in connus.values() if dt.datetime.fromisoformat(a["d"]) >= limite]
    articles.sort(key=lambda a: a["d"], reverse=True)
    articles = articles[:MAX]
    if erreurs == len(requetes) and SORTIE.exists():
        print("Aucun flux joignable : on garde la revue précédente.")
        return
    SORTIE.write_text(json.dumps({"maj": maintenant.isoformat(), "articles": articles},
                                 ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(articles)} articles, {erreurs} erreur(s)")


if __name__ == "__main__":
    main()
