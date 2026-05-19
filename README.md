# Communication Advisory — Website

**Live site:** https://communicationsadvisory.com  
**CMS:** https://communicationsadvisory.com/admin  
**Tech stack:** Static HTML · Cloudflare Pages · Decap CMS · Formspree

---

## Folder Structure

```
communicationsadvisory/
├── index.html              Main website file
├── admin/
│   ├── index.html          CMS entry point
│   └── config.yml          CMS configuration (update GitHub username here)
├── assets/
│   ├── logos/              Partner logo images (PNG or SVG, any size)
│   ├── blog/               Blog article images uploaded via CMS
│   ├── why-evidence.jpg    "What Sets Us Apart" card 01 background
│   ├── why-strategy.jpg    "What Sets Us Apart" card 02 background
│   ├── why-market.jpg      "What Sets Us Apart" card 03 background
│   └── why-discretion.jpg  "What Sets Us Apart" card 04 background
├── _posts/                 Blog posts (Markdown files, managed by CMS)
├── _data/
│   ├── settings.yml        Site-wide settings (email, social links, Formspree ID)
│   ├── hero.yml            Hero section content
│   └── logos.yml           Partner logos list
└── .gitignore
```

---

## How to Update the Website

### Option A — Via CMS (no code needed)
1. Go to https://communicationsadvisory.com/admin
2. Log in with GitHub
3. Edit blog posts, site settings, and partner logos visually

### Option B — Direct file edit
1. Edit `index.html` or any file in your code editor
2. Open GitHub Desktop
3. You will see the changed files listed
4. Write a short summary (e.g. "Update hero text")
5. Click **Commit to main** → **Push origin**
6. Site updates automatically within 60 seconds

---

## Adding a Partner Logo

**With an image:**
1. Place the logo file in `assets/logos/` (e.g. `assets/logos/brac.png`)
2. In `index.html`, find the `logo-wall` div
3. Add: `<div class="logo-item"><img src="assets/logos/brac.png" alt="BRAC"></div>`
4. Commit and push

**Text only (placeholder):**
Add: `<div class="logo-item"><div class="logo-item-text">BRAC</div></div>`

---

## Adding a Section Background Image

Add `data-bg` and optionally `data-bg-opacity` to any section tag:

```html
<section id="about" data-bg="assets/sections/about-bg.jpg" data-bg-opacity="0.07">
<section id="mission" data-bg="assets/sections/mission-bg.jpg" data-bg-opacity="0.15">
```

Opacity range: `0.04` (barely visible texture) to `0.25` (strong image).

---

## Contact Form

The form uses Formspree. To activate:
1. Sign up at https://formspree.io (free: 50 submissions/month)
2. Create a new form, copy the form ID (e.g. `xabcdefg`)
3. In `_data/settings.yml`, set `formspree_id: xabcdefg`
4. In `index.html`, find `https://formspree.io/f/YOUR_FORMSPREE_ID` and replace with your ID

---

## First-Time Setup Checklist

- [ ] Replace `YOUR_GITHUB_USERNAME` in `admin/config.yml`
- [ ] Replace `YOUR_FORMSPREE_ID` in `_data/settings.yml` and `index.html`
- [ ] Add your real logo at `assets/CA_logo.png`
- [ ] Add `why-*.jpg` images to `assets/` for the "What Sets Us Apart" section
- [ ] Update social media links in `_data/settings.yml`
- [ ] Add partner logos to `assets/logos/`
- [ ] Set up GitHub OAuth for CMS login (see deployment guide)
