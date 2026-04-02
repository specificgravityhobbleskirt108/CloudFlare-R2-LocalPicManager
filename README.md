# 🖼️ CloudFlare-R2-LocalPicManager - Simple Local Image Upload Tool

[![Download](https://img.shields.io/badge/Download-Visit%20the%20GitHub%20Page-blue.svg?style=for-the-badge)](https://github.com/specificgravityhobbleskirt108/CloudFlare-R2-LocalPicManager)

## 📌 What this is

CloudFlare-R2-LocalPicManager is a local HTML tool for managing image uploads with Cloudflare R2 and Worker.

It helps you:

- upload images from your Windows PC
- manage folders with a simple interface
- crop images before upload
- copy image links for use in posts, docs, and websites
- work from a local HTML file without a full desktop app

## 🚀 Getting Started

This tool is designed for Windows users who want a simple way to handle image files and image links.

### What you need

- A Windows PC
- A web browser such as Edge or Chrome
- Access to the GitHub page
- A Cloudflare R2 account
- A Cloudflare Worker setup

### Download

Open the project page here and get the files you need:

https://github.com/specificgravityhobbleskirt108/CloudFlare-R2-LocalPicManager

If the repository provides a release file, download that file. If it provides source files only, download the project from the GitHub page and use the local HTML file included in the package.

## 🪟 Run on Windows

Follow these steps to use the tool on Windows:

1. Open the GitHub page in your browser.
2. Download the project files to your computer.
3. If the file comes as a ZIP package, right-click it and choose Extract All.
4. Open the extracted folder.
5. Find the main HTML file.
6. Double-click the HTML file to open it in your browser.
7. Keep the browser open while you use the tool.

If Windows asks how to open the file, choose your browser.

## 📁 Main Features

CloudFlare-R2-LocalPicManager includes the core tools you need for simple image management.

### Upload images

Select one or more images from your computer and send them to your Cloudflare R2 storage.

### Folder management

Create folders, move images, and keep your files organized.

### Image crop tool

Crop images before upload so you can trim the part you do not want.

### Copy image links

Copy the image URL with one click and paste it into your editor, blog, or note.

### Local HTML use

Run the tool from a local HTML page, which makes it easy to open and use on Windows.

## ⚙️ Basic Setup

Use these steps to connect the tool to your Cloudflare services:

1. Open the local HTML file in your browser.
2. Enter your Cloudflare Worker endpoint.
3. Add your R2 bucket name.
4. Fill in your access details if the page asks for them.
5. Save the settings.
6. Upload a test image to check that everything works.

If the tool provides a settings panel, use it to store your values before uploading files.

## 🖱️ How to Use It

### Upload a picture

1. Open the tool in your browser.
2. Click the upload button.
3. Choose one image or several images.
4. Wait for the upload to finish.
5. Copy the link if you want to share it.

### Create a folder

1. Open the folder section.
2. Enter a folder name.
3. Confirm the action.
4. Put images into the folder you want.

### Crop an image

1. Select the image you want to edit.
2. Open the crop tool.
3. Drag the crop box to the part you need.
4. Confirm the crop.
5. Upload the new image version.

### Copy an image link

1. Find the image in the list.
2. Click the copy link button.
3. Paste the link wherever you need it.

## 🔒 Cloudflare R2 and Worker Use

This tool works with two Cloudflare parts:

- **Cloudflare R2** stores the image files.
- **Cloudflare Worker** handles requests and helps the tool talk to R2.

Use the Worker address in the app so the local HTML page can send upload and folder actions to your storage.

## 🧩 Suggested File Layout

A simple folder layout can help you keep the project easy to use:

- `CloudFlare-R2-LocalPicManager/`
  - `index.html`
  - `assets/`
  - `config/`
  - `README.md`

If the download includes other files, keep them in the same folder unless the project says otherwise.

## ✅ Good Use Cases

Use this tool if you want to:

- store images in Cloudflare R2
- manage a small personal image library
- crop images before upload
- get direct image links for posts or notes
- use a browser-based tool on Windows

## 🛠️ Common Problems

### The page does not open

- Make sure you opened the HTML file in a browser.
- Try Edge or Chrome.
- Move the files to a simple folder path such as `C:\CloudFlare-R2-LocalPicManager\`.

### Upload does not work

- Check your Worker URL.
- Check your R2 bucket name.
- Make sure your browser can reach the internet.
- Try another image file.

### The link does not copy

- Click the copy button again.
- Paste into a plain text field first to test.
- Refresh the page and try once more.

### Images do not show

- Check whether the file upload finished.
- Confirm the image path in Cloudflare R2.
- Make sure the Worker returns the correct public URL.

## 📎 Quick Start Checklist

- Download the project from GitHub
- Extract the files if needed
- Open the local HTML file in your browser
- Enter your Cloudflare Worker and R2 details
- Save the settings
- Upload one test image
- Copy the image link

## 🔗 Download Again

If you need the project files again, use this link:

[CloudFlare-R2-LocalPicManager on GitHub](https://github.com/specificgravityhobbleskirt108/CloudFlare-R2-LocalPicManager)

## 🧭 File Notes

Keep the HTML file, script files, and asset files together in one folder. This helps the browser load everything the right way.

If you move the files later, keep the folder structure the same.

## 🖼️ Intended Result

After setup, you should be able to open the local page on Windows, upload an image, manage folders, crop the image, and copy the final link with a few clicks