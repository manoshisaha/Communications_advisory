# Communication Advisory — Complete Setup Guide

**Your site is live at:** https://communicationsadvisory.com
**GitHub repo:** https://github.com/manoshisaha/communicationsadvisory-website

---

## What Still Needs Doing (in order)

1. Upload these files to GitHub
2. Set up the CMS login (free, via Cloudflare)
3. Connect the contact form (Formspree, free)
4. Add your real logo
5. Add images (logo wall, blog, why-section)

---

## STEP 1 — Upload These Files to GitHub

Open **GitHub Desktop**.

You will see all the new files listed as changes:
- `admin/config.yml` (updated)
- `functions/api/auth/index.js` (new)
- `functions/api/auth/callback.js` (new)
- `_posts/*.md` (3 sample blog posts)
- `_data/*.yml` (settings files)
- `index.html` (updated with Formspree form)

1. Write summary: `Add CMS auth, blog posts, and contact form`
2. Click **Commit to main**
3. Click **Push origin**

Wait 60 seconds. Cloudflare redeploys automatically.

---

## STEP 2 — Set Up CMS Login (Free)

### 2a — Create a GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in:
   - Application name: `Communication Advisory CMS`
   - Homepage URL: `https://communicationsadvisory.com`
   - Authorization callback URL: `https://communicationsadvisory.com/api/auth/callback`
4. Click **Register application**
5. Copy the **Client ID** (you will need it in 2b)
6. Click **Generate a new client secret** → copy the **Client Secret**
   ⚠️ Save both values — the secret is only shown once.

### 2b — Add the secrets to Cloudflare

1. Go to: https://dash.cloudflare.com
2. Click **Workers & Pages** → click your `communicationsadvisory` project
3. Click **Settings** → **Environment variables**
4. Click **Add variable**:
   - Name: `GITHUB_CLIENT_ID` | Value: (paste your Client ID)
5. Click **Add variable** again:
   - Name: `GITHUB_CLIENT_SECRET` | Value: (paste your Client Secret)
6. Make sure both are set under **Production**
7. Click **Save and deploy**

### 2c — Test the CMS

1. Go to: https://communicationsadvisory.com/admin
2. Click **Login with GitHub**
3. Authorise the app when GitHub asks
4. You should see the CMS editor with Blog Posts and Site Settings

If it works, you can now write and publish blog posts from the CMS without touching code.

---

## STEP 3 — Connect the Contact Form (Formspree)

### 3a — Create your Formspree account

1. Go to: https://formspree.io
2. Sign up for a free account (50 submissions/month free)
3. Click **+ New Form**
4. Name it: `CA Contact Form`
5. Copy your form endpoint — it looks like: `https://formspree.io/f/xabcdefg`
   Your form ID is the part after `/f/` — e.g. `xabcdefg`

### 3b — Add your form ID to index.html

1. Open `index.html` in a text editor (Notepad, VS Code, etc.)
2. Press Ctrl+F (or Cmd+F on Mac) and search for:
   `YOUR_FORMSPREE_ID`
3. Replace it with your actual form ID, e.g.:
   `xabcdefg`
4. Save the file

### 3c — Push the change to GitHub

Open GitHub Desktop → you will see `index.html` changed
→ Write summary: `Connect Formspree contact form`
→ **Commit to main** → **Push origin**

Now when someone submits the contact form, you will receive an email at the address linked to your Formspree account.

---

## STEP 4 — Add Your Real Logo

### 4a — Copy your logo file

1. Rename your logo file to `CA_logo.png`
2. Place it in the `assets/` folder

### 4b — Update index.html

1. Open `index.html`
2. Search for: `LOGO SETUP`
3. You will see these two lines:

```html
<!-- <img src="assets/CA_logo.png" alt="Communication Advisory" style="height:44px;width:auto;"> -->
<svg class="nav-logo-icon" ...>
```

4. Uncomment the `<img>` line (remove the `<!--` and `-->`)
5. Delete the entire `<svg>...</svg>` block below it
6. Save and push via GitHub Desktop

---

## STEP 5 — Add Images

### Partner logos (logo wall section)

1. Place logo PNG files in `assets/logos/`
   e.g. `assets/logos/brac.png`, `assets/logos/grameen.png`

2. Open `index.html` and search for `logo-wall`

3. Inside the `<div class="logo-wall" id="logoWall">` section, add:
```html
<div class="logo-item"><img src="assets/logos/brac.png" alt="BRAC"></div>
<div class="logo-item"><img src="assets/logos/grameen.png" alt="Grameen Bank"></div>
```
   You can add as many as needed — the wall wraps automatically.

4. Remove or keep the placeholder text items.

5. Push via GitHub Desktop.

### "What Sets Us Apart" hover images

Place these four photos in `assets/`:
- `why-evidence.jpg` — for card 01 (We Lead with Evidence)
- `why-strategy.jpg` — for card 02 (We Think Like Strategists)
- `why-market.jpg` — for card 03 (We Know This Market)
- `why-discretion.jpg` — for card 04 (We Protect Discretion)

Use any dark/professional photography. They appear at 10% opacity on hover over the red background — so the exact subject does not matter much.

### Blog article images

Upload through the CMS at `/admin` → Blog Posts → open a post → upload thumbnail image.

Or manually: place JPG files in `assets/blog/` and reference them in the markdown post frontmatter:
```yaml
image: "/assets/blog/your-image.jpg"
```

### Section background images

Add `data-bg` to any section in `index.html`:
```html
<section id="about" data-bg="assets/sections/about-bg.jpg" data-bg-opacity="0.07">
<section id="mission" data-bg="assets/sections/mission-bg.jpg" data-bg-opacity="0.15">
<section id="contact" data-bg="assets/sections/contact-bg.jpg" data-bg-opacity="0.06">
```

Create the `assets/sections/` folder and place images there.

---

## Writing Blog Posts (via CMS — no code needed)

1. Go to: https://communicationsadvisory.com/admin
2. Click **Blog Posts** → **New Blog Post**
3. Fill in: Title, Category, Date, Excerpt, and the full article body
4. Upload a thumbnail image (optional but recommended)
5. Toggle **Feature on Homepage** ON for the article you want displayed as the large card
6. Click **Publish**

The post is saved to GitHub automatically and the site redeploys within 60 seconds.

---

## Folder Structure Reference

```
communicationsadvisory/
├── index.html                  Main website — edit carefully
├── .gitignore
├── SETUP_GUIDE.md              This file
│
├── admin/
│   ├── index.html              CMS login page
│   └── config.yml              CMS config (GitHub repo already set)
│
├── functions/
│   └── api/auth/
│       ├── index.js            OAuth start (do not edit)
│       └── callback.js         OAuth callback (do not edit)
│
├── _posts/                     Blog posts (managed by CMS)
│   ├── 2025-05-01-*.md
│   ├── 2025-04-01-*.md
│   └── 2025-03-01-*.md
│
├── _data/
│   ├── settings.yml            Email, Formspree ID, social links
│   ├── hero.yml                Hero text
│   └── logos.yml               Partner logos list
│
└── assets/
    ├── CA_logo.png             ← Add your logo here
    ├── why-evidence.jpg        ← Add hover images for Why section
    ├── why-strategy.jpg
    ├── why-market.jpg
    ├── why-discretion.jpg
    ├── logos/                  ← Partner logo PNGs
    ├── blog/                   ← Blog article images (CMS uploads here)
    └── sections/               ← Section background images (optional)
```

---

## Quick Update Reference

| Task | How |
|------|-----|
| Write a blog post | /admin → Blog Posts → New |
| Change email or social links | /admin → Site Settings → General Info |
| Add a partner logo | Drop PNG in assets/logos/, add img tag in index.html, push |
| Update hero text | /admin → Site Settings → Homepage Hero Text |
| Change any site text | Edit index.html directly, push via GitHub Desktop |
| Add section background | Add data-bg attribute to section tag in index.html |

---

## Support Contacts

- Cloudflare Pages docs: https://developers.cloudflare.com/pages/
- Decap CMS docs: https://decapcms.org/docs/
- Formspree docs: https://help.formspree.io/
- GitHub Desktop: https://docs.github.com/en/desktop
