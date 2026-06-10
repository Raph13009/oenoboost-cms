import test from "node:test";
import assert from "node:assert/strict";
import {
  isRichTextHtmlEmpty,
  normalizeRichTextForStorage,
  sanitizeRichTextHtml,
} from "./richtext-html";

test("sanitizeRichTextHtml conserve les balises autorisées", () => {
    const input =
      '<p>Texte <strong>gras</strong> <em>italique</em> <u>souligné</u></p><ul><li>un</li></ul><p><a href="https://ex.com" target="_blank" rel="noopener">lien</a></p>';
    const out = sanitizeRichTextHtml(input);
    assert.match(out, /<strong>gras<\/strong>/);
    assert.match(out, /<em>italique<\/em>/);
    assert.match(out, /<u>souligné<\/u>/);
    assert.match(out, /<ul><li>un<\/li><\/ul>/);
    assert.match(out, /<a href="https:\/\/ex.com"/);
});

test("sanitizeRichTextHtml retire les balises non autorisées", () => {
  const out = sanitizeRichTextHtml('<p>ok</p><script>alert(1)</script><h1>titre</h1>');
  assert.equal(out, "<p>ok</p>titre");
});

test("isRichTextHtmlEmpty détecte le contenu vide TipTap", () => {
  assert.equal(isRichTextHtmlEmpty(""), true);
  assert.equal(isRichTextHtmlEmpty("<p></p>"), true);
  assert.equal(isRichTextHtmlEmpty("<p><br></p>"), true);
  assert.equal(isRichTextHtmlEmpty("<p>  </p>"), true);
  assert.equal(isRichTextHtmlEmpty("<p>texte</p>"), false);
});

test("normalizeRichTextForStorage retourne null pour le vide", () => {
  assert.equal(normalizeRichTextForStorage("<p></p>"), null);
});

test("normalizeRichTextForStorage assainit avant persistance", () => {
  assert.equal(
    normalizeRichTextForStorage('<p>ok</p><img src=x onerror=alert(1)>'),
    "<p>ok</p>"
  );
});
