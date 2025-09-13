# Debt Management App

A modern web application for managing debts between creditors and debtors, built with Firebase and vanilla JavaScript.

## 🌐 Live Demo

**Production Site**: https://debt-app.spyit2025.github.io

## 🚀 Features

- **User Authentication**: Secure login/registration system
- **Dual Dashboard**: Separate interfaces for creditors and debtors
- **Real-time Data**: Firebase Firestore integration
- **Responsive Design**: Works on all devices (mobile, tablet, desktop)
- **Modern UI**: Clean and intuitive user interface

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Deployment**: GitHub Pages with GitHub Actions
- **Styling**: Custom CSS with responsive design

## 📱 Screenshots

- Login/Registration system
- Creditor Dashboard with debt management
- Debtor Dashboard with payment tracking
- Mobile-responsive design

## 🚀 Deployment

This app is automatically deployed to GitHub Pages using GitHub Actions. Every push to the `main` branch triggers an automatic deployment.

### Manual Deployment Steps:

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

2. **GitHub Pages Settings**:
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` (created by GitHub Actions)
   - Custom domain: `debt-app.spyit2025.github.io`

## 🔧 Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/spyit2025/Debt-app.git
   cd Debt-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local server**:
   ```bash
   npm start
   ```

4. **Open in browser**: http://localhost:3000

## 📁 Project Structure

```
Debt-app/
├── css/                    # Stylesheets
├── js/                     # JavaScript modules
├── pages/                  # HTML pages
│   ├── auth/              # Authentication pages
│   └── dashboard/         # Dashboard pages
├── .github/workflows/     # GitHub Actions
├── index.html             # Main entry point
└── package.json           # Dependencies
```

## 🔐 Firebase Configuration

The app uses Firebase for:
- **Authentication**: User login/registration
- **Firestore**: Real-time database
- **Storage**: File uploads
- **Analytics**: Usage tracking

## 📄 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

Created by spyit2025

---

**Live Site**: https://debt-app.spyit2025.github.io