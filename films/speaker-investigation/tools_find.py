#!/usr/bin/env python3
"""Find quote word-runs in a patent PDF's OCR layer → page number + boxes (in rendered-pixel coords at DPI)."""
import re, subprocess, sys, json, html
DPI = 150
def words(pdf):
    x = subprocess.run(['pdftotext', '-bbox', pdf, '-'], capture_output=True, text=True).stdout
    pages = x.split('<page ')[1:]; out = []
    for pi, pg in enumerate(pages):
        for m in re.finditer(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', pg):
            out.append((pi + 1, *[float(v) * DPI / 72 for v in m.groups()[:4]], html.unescape(m.group(5))))
    return out
norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
def find(pdf, phrase):
    W = words(pdf); target = [norm(w) for w in phrase.split()]
    for i in range(len(W)):
        j, k, run = i, 0, []
        while k < len(target) and j < len(W) and len(run) < len(target) + 6:
            w = norm(W[j][5])
            if not w: j += 1; continue
            if w == target[k] or (len(w) > 2 and (target[k].startswith(w) or w.startswith(target[k]))): run.append(W[j]); k += 1; j += 1
            elif run and k < len(target) and target[k].startswith(w): run.append(W[j]); j += 1
            else: break
        if k == len(target): return run
    return None
if __name__ == '__main__':
    pdf, phrase = sys.argv[1], ' '.join(sys.argv[2:])
    r = find(pdf, phrase)
    print(json.dumps([[p, round(a), round(b), round(c), round(d), w] for p, a, b, c, d, w in r]) if r else 'NOT FOUND')
