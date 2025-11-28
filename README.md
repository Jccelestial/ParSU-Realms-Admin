# ParSU Realms Admin Dashboard

A web-based admin dashboard for managing ParSU Realms game users, quests, and analytics.

## Features

### 📊 Dashboard
- Total users count
- Completed quests statistics
- Active users today
- Average playtime
- Quest completion charts
- User registration trends

### 👥 User Management
- View all registered users
- Search and filter users
- See user quest progress
- View last login times
- Delete user accounts

### 🎯 Quest Analytics
- Track completion rates for all quests:
  - CEC Quest
  - COED Quest
  - CBM Quest
  - CAH Quest
  - Sangay Quest
  - San Jose Quest
- Visual progress bars
- Completion percentages

### 📈 Usage Analytics
- Peak hour activity
- Most popular quests
- User engagement metrics

### 📝 Activity Logs
- Login events
- Quest completions
- User registrations
- Error tracking

## Setup Instructions

### 1. Configure Supabase Connection

Open `app.js` and replace the placeholder with your Supabase credentials:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### 2. Add Supabase Library

Add this to your `index.html` before the closing `</body>` tag:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### 3. Update Database Queries

Replace the mock data in `app.js` with actual Supabase queries. Example:

```javascript
// Initialize Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fetch users
async function loadUsers() {
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching users:', error);
        return;
    }
    
    // Render users...
}

// Fetch quest completions
async function loadQuests() {
    const { data: quests, error } = await supabase
        .from('quest_progress')
        .select('quest_name, COUNT(*)')
        .eq('completed', true)
        .group('quest_name');
    
    // Render quest stats...
}
```

### 4. Deploy

You can deploy this dashboard using any static hosting provider. Below are recommended options and step-by-step instructions for Vercel (fast and free for static sites).

Option highlights:

- **Vercel (recommended)**: Automatic deployments from Git, or one-off deploys from the CLI.
- **GitHub Pages**: Push to a `gh-pages` branch.
- **Netlify**: Drag and drop the folder or connect the repo.
- **Any web server**: Upload the files via FTP or SFTP.

Deploying to Vercel (quick start)

1) Web UI (Git integration)
    - Create a Git repository (GitHub, GitLab, or Bitbucket) and push this project.
    - Go to https://vercel.com/import and import your repository.
    - Vercel will detect a static site. Use the default settings and click "Deploy".

2) CLI (one-off from your machine)
    - Install the Vercel CLI (requires Node.js/npm):

```sh
npm install -g vercel
```

    - Login and deploy from your project folder:

```sh
vercel login
cd /path/to/your/project
vercel --prod
```

    - The CLI will walk you through linking the project to a Vercel account and will print the deployment URL.

Notes on configuration

- This repo is a static site (HTML/CSS/JS + images). Vercel will serve the files as-is. A `vercel.json` with a static config has been added to this repository to ensure Vercel uses the static builder.

- If you use Supabase for runtime secrets (keys), do NOT commit them into the repo. Instead set them in Vercel's dashboard as Environment Variables (Project Settings → Environment Variables) and read them in client code via a safe pattern, or better, move sensitive operations to server-side functions.

If you'd like, I can also create a tiny `package.json` and an npm script to make CLI deployment even easier, or set up a GitHub Action to automatically deploy on push to `main`.

### 5. Secure Access

**Important**: Add authentication before deploying!

```javascript
// Example: Simple password protection
const ADMIN_PASSWORD = 'your_secure_password';

function checkAuth() {
    const password = prompt('Enter admin password:');
    if (password !== ADMIN_PASSWORD) {
        alert('Access denied!');
        window.location.href = 'about:blank';
    }
}

// Call on page load
checkAuth();
```

Or integrate with Supabase Auth for proper authentication.

## Database Schema

Ensure your Supabase database has these tables:

### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username TEXT,
    email TEXT,
    created_at TIMESTAMP,
    last_login TIMESTAMP
);
```

### quest_progress
```sql
CREATE TABLE quest_progress (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    quest_name TEXT,
    completed BOOLEAN,
    completed_at TIMESTAMP
);
```

### activity_logs
```sql
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action TEXT,
    details TEXT,
    created_at TIMESTAMP
);
```

## Customization

- **Colors**: Edit CSS variables in `styles.css`
- **Charts**: Modify Chart.js configurations in `app.js`
- **Layout**: Update HTML structure in `index.html`

## Support

For issues or questions, refer to:
- Supabase docs: https://supabase.com/docs
- Chart.js docs: https://www.chartjs.org/docs/

## Security Notes

⚠️ **Before going live**:
1. Add proper authentication
2. Implement role-based access control
3. Use environment variables for sensitive data
4. Enable HTTPS
5. Add rate limiting
6. Implement audit logging
