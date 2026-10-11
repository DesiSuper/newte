# DocuFlow - Advanced Client-Side PDF Suite (iLovePDF Alternative)

A modern, lightning-fast, and 100% private PDF utility suite built with React, Vite, Tailwind CSS, and `pdf-lib`. Works entirely in the browser without uploading any documents to external servers.

## Features
- **Merge PDF**: Combine multiple PDF documents into one ordered file.
- **Split PDF**: Extract custom page ranges or batch-extract every page into a ZIP.
- **Compress PDF**: Optimize file streams and reduce PDF file size.
- **Images to PDF**: Convert JPG, PNG, and WebP images to customized PDF documents.
- **Rotate PDF**: Rotate all pages or specific pages (90°, 180°, 270°).
- **Watermark PDF**: Add custom text watermarks with custom opacity, color, angle, and size.
- **Page Numbers**: Add clean page numbering (Page X of Y, X / Y) to any location.
- **Organize & Delete Pages**: Visual page selector to remove unwanted pages and reorder.
- **Sign PDF**: Draw digital signature with canvas and stamp anywhere on your document.
- **Extract Text**: Extract readable text from PDF documents for notes and copying.

---

## 🚀 How to Upload to GitHub & Deploy to Vercel

### Step 1: Push to GitHub
Open your terminal in this project folder:
```bash
git init
git add .
git commit -m "feat: complete advanced PDF suite"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New"** > **"Project"**.
3. Import your GitHub repository.
4. Vercel automatically detects **Vite**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **"Deploy"**! Your site is live in ~30 seconds.
