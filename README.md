# Raksha M - Portfolio

A modern, responsive portfolio website built with Jekyll and hosted on GitHub Pages.

## 🚀 Features

- **Clean & Modern Design** - Minimal aesthetic with smooth animations
- **Fully Responsive** - Works perfectly on all devices
- **Fast Loading** - Static site with optimized assets
- **SEO Friendly** - Built-in SEO optimization with jekyll-seo-tag
- **Easy to Customize** - All data stored in YAML files

## 📁 Project Structure

```
jekyll-portfolio/
├── _config.yml           # Site configuration
├── _data/                # Data files (YAML)
│   ├── personal.yml      # Personal details
│   ├── experiences.yml   # Work experience
│   ├── projects.yml      # Projects
│   ├── skills.yml        # Skills
│   └── awards.yml        # Awards & achievements
├── _includes/            # Reusable components
│   ├── head.html
│   ├── navigation.html
│   ├── footer.html
│   └── sections/         # Page sections
│       ├── hero.html
│       ├── about.html
│       ├── experience.html
│       ├── projects.html
│       ├── skills.html
│       ├── awards.html
│       └── contact.html
├── _layouts/             # Page layouts
│   └── default.html
├── _sass/                # SCSS partials
│   ├── navigation.scss
│   ├── hero.scss
│   ├── about.scss
│   ├── experience.scss
│   ├── projects.scss
│   ├── skills.scss
│   ├── awards.scss
│   ├── contact.scss
│   └── footer.scss
├── assets/               # Static assets
│   ├── css/
│   │   └── main.scss
│   └── js/
│       └── main.js
├── index.html            # Homepage
├── Gemfile
└── README.md
```

## 🛠️ Setup & Installation

### Prerequisites

- Ruby (v2.7 or higher)
- Bundler gem

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd jekyll-portfolio
   ```

2. **Install dependencies**
   ```bash
   bundle install
   ```

3. **Run the development server**
   ```bash
   bundle exec jekyll serve
   ```

4. **Open in browser**
   Navigate to `http://localhost:4000`

## 📝 Customization

### Update Personal Information

Edit `_data/personal.yml`:

```yaml
name: "Your Name"
role: "Your Role"
email: "your.email@example.com"
phone: "+91 1234567890"
# ... etc
```

### Add/Edit Experience

Edit `_data/experiences.yml`:

```yaml
- company: "Company Name"
  role: "Your Role"
  duration: "Jan 2023 - Present"
  location: "City, Country"
  description: "Brief description"
  highlights:
    - "Achievement 1"
    - "Achievement 2"
```

### Add/Edit Projects

Edit `_data/projects.yml`:

```yaml
- title: "Project Name"
  description: "Project description"
  tags:
    - "React"
    - "TypeScript"
  links:
    demo: "https://demo-link.com"
    github: "https://github.com/username/repo"
```

### Add/Edit Skills

Edit `_data/skills.yml`:

```yaml
categories:
  - title: "Category Name"
    skills:
      - name: "Skill Name"
        icon: "icon-name"
```

### Add/Edit Awards

Edit `_data/awards.yml`:

```yaml
- title: "Award Name"
  description: "Award description"
  highlight: "Prize/Recognition"
```

## 🚀 Deployment

### GitHub Pages (Free)

1. Push to GitHub repository named `<username>.github.io`
2. Go to repository Settings → Pages
3. Select source as "Deploy from a branch"
4. Select branch: `main` / `master`
5. Your site will be live at `https://<username>.github.io`

### Netlify (Free)

1. Connect your GitHub repository to Netlify
2. Build command: `jekyll build`
3. Publish directory: `_site`
4. Deploy!

### Vercel (Free)

1. Import your GitHub repository
2. Framework preset: Jekyll
3. Deploy!

## 🎨 Color Scheme

| Color | Hex Code | Usage |
|-------|----------|-------|
| Primary | `#3555ff` | Buttons, links, accents |
| Secondary | `#7f5cff` | Gradients, highlights |
| Accent | `#ff6a3a` | Warnings, important |
| Accent Green | `#2cc3a9` | Success states |
| Navy | `#191d30` | Dark backgrounds |

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Support

If you found this helpful, please consider giving it a ⭐ on GitHub!

---

Built with ❤️ using Jekyll
# raksha-portfolio
