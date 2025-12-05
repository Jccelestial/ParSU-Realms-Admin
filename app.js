// Supabase Configuration
const SUPABASE_URL = 'https://blfsxyphkeuoddnepbvw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsZnN4eXBoa2V1b2RkbmVwYnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDY2MDUsImV4cCI6MjA3ODA4MjYwNX0.-VH1FhhUlwGCbx28KVe6gRlJeJ79ppM60yY9S0aaufQ';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin credentials (you should change this)
const ADMIN_EMAIL = 'admin@parsu.edu';
const ADMIN_PASSWORD = 'admin123';

// SVG Icon Helper
function getIcon(type) {
    const icons = {
        building: '<img src="image/COED.png" alt="COED" class="icon" style="width:200px;height:120px;vertical-align:middle;">',
        computer: '<img src="image/CEC.png" alt="CEC" class="icon" style="width:200px;height:120px;vertical-align:middle;">',
        science: '<img src="image/COS.png" alt="COS" class="icon" style="width:200px;height:120px;vertical-align:middle;">',
        chart: '<img src="image/CBM.png" alt="CBM" class="icon" style="width:200px;height:120px;vertical-align:middle;">',
        palette: '<img src="image/CAH.png" alt="CAH" class="icon" style="width:200px;height:120px;vertical-align:middle;">',
        mountain: '<img src="image/CFAMS.png" alt="CFAMS" class="icon" style="width:200px;height:120px;vertical-align:middle;">',
        tree: '<img src="image/Sanjose.png" alt="Sanjose" class="icon" style="width:200px;height:120px;vertical-align:middle;">',
    };
    return icons[type] || '';
}

// Check authentication on load
let isAuthenticated = false;

// Store chart instances to prevent reuse errors
let chartInstances = {};

function destroyChart(chartId) {
    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy();
        delete chartInstances[chartId];
    }
}

// Check authentication
function checkAuth() {
    const loggedIn = localStorage.getItem('adminLoggedIn');
    const loginTime = localStorage.getItem('adminLoginTime');
    
    if (!loggedIn || loggedIn !== 'true') {
        // Not logged in, redirect to login page
        window.location.href = 'login.html';
        return false;
    }
    
    // Check if session is expired (24 hours)
    if (loginTime) {
        const now = new Date();
        const loginDate = new Date(loginTime);
        const hoursSinceLogin = (now - loginDate) / (1000 * 60 * 60);
        
        if (hoursSinceLogin > 24) {
            // Session expired
            logout();
            return false;
        }
    }
    
    isAuthenticated = true;
    return true;
}

// Logout function
function logout() {
    // Clear all admin session keys
    try {
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminLoginTime');
        localStorage.removeItem('adminEmail');
    } catch (e) {
        console.warn('Error clearing localStorage during logout', e);
    }

    // Expose logout on window in case other scripts call it
    try {
        window.logout = logout;
    } catch (e) {
        /* ignore */
    }

    // Redirect to login page
    window.location.href = 'login.html';
}

// Initialize dashboard after authentication
async function initDashboard() {
    await loadDashboard();
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Update page
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}-page`).classList.add('active');
        
        // Update title
        document.getElementById('page-title').textContent = 
            item.textContent.trim().replace(/^[^\s]+\s/, '');
        
        // Load page data
        loadPageData(page);
    });
});

// Load page data
function loadPageData(page) {
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'users':
            loadUsers();
            break;
        case 'quests':
            loadQuests();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'logs':
            loadLogs();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        // Try to get all users using RPC function first
        let { data: allUsers, error: rpcError } = await supabase.rpc('get_all_users');
        
        // Fallback to player_progress if function doesn't exist
        if (rpcError) {
            console.log('Using player_progress for dashboard:', rpcError.message);
            const { data: progressData, error } = await supabase
                .from('player_progress')
                .select('*');
            allUsers = progressData || [];
        }
        
        if (!allUsers) allUsers = [];
        
        // Total users count
        document.getElementById('total-users').textContent = allUsers.length;
        
        // Calculate total quest completions
        const totalCompletions = allUsers.reduce((sum, user) => {
            return sum + 
                (user.ced_finish ? 1 : 0) + 
                (user.cec_finish ? 1 : 0) + 
                (user.cos_finish ? 1 : 0) + 
                (user.cbm_finish ? 1 : 0) + 
                (user.cah_finish ? 1 : 0) + 
                (user.sangay_finish ? 1 : 0) + 
                (user.sanjose_finish ? 1 : 0);
        }, 0);
        document.getElementById('completed-quests').textContent = totalCompletions;
        
        // Average quests per user (only for users who have played)
        const usersWhoPlayed = allUsers.filter(u => 
            u.ced_finish || u.cec_finish || u.cos_finish || u.cbm_finish || 
            u.cah_finish || u.sangay_finish || u.sanjose_finish
        ).length;
        const avgQuests = usersWhoPlayed > 0 
            ? (totalCompletions / usersWhoPlayed).toFixed(1) 
            : '0';
        document.getElementById('avg-playtime').textContent = avgQuests;
        
        // Active players (users who have started playing the game)
        const activePlayers = allUsers.filter(user => {
            // Count users who have progress in player_progress table
            return user.last_played || 
                   user.ced_finish || user.cec_finish || user.cos_finish || 
                   user.cbm_finish || user.cah_finish || user.sangay_finish || 
                   user.sanjose_finish ||
                   user.finish_quest_count > 0;
        }).length;
        document.getElementById('active-users').textContent = activePlayers;
    
        // Quest completion chart
        const questCounts = {
            CED: allUsers.filter(p => p.ced_finish).length,
            CEC: allUsers.filter(p => p.cec_finish).length,
            COS: allUsers.filter(p => p.cos_finish).length,
            CBM: allUsers.filter(p => p.cbm_finish).length,
            CAH: allUsers.filter(p => p.cah_finish).length,
            Sangay: allUsers.filter(p => p.sangay_finish).length,
            'San Jose': allUsers.filter(p => p.sanjose_finish).length
        };
        
        const hasData = Object.values(questCounts).some(count => count > 0);
        
        const questCtx = document.getElementById('questChart');
        if (questCtx) {
            destroyChart('questChart');
            chartInstances['questChart'] = new Chart(questCtx, {
                type: 'doughnut',
                data: {
                    labels: hasData ? Object.keys(questCounts) : ['No completions yet'],
                    datasets: [{
                        data: hasData ? Object.values(questCounts) : [1],
                        backgroundColor: hasData ? [
                            '#6366f1', '#8b5cf6', '#10b981', 
                            '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'
                        ] : ['#e5e7eb'],
                        hoverBackgroundColor: hasData ? [
                            '#4f46e5', '#7c3aed', '#059669',
                            '#d97706', '#dc2626', '#2563eb', '#db2777'
                        ] : ['#e5e7eb'],
                        hoverBorderColor: '#fff',
                        hoverBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    animation: {
                        animateRotate: true,
                        animateScale: true,
                        duration: 1500,
                        easing: 'easeInOutQuart'
                    },
                    interaction: {
                        mode: 'nearest',
                        intersect: true
                    },
                    onHover: (event, activeElements) => {
                        if (event.native && event.native.target) {
                            event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
                        }
                    },
                    onClick: (event, activeElements) => {
                        if (activeElements.length > 0 && hasData) {
                            const index = activeElements[0].index;
                            const questName = Object.keys(questCounts)[index];
                            const count = Object.values(questCounts)[index];
                            alert(`${questName}: ${count} completion${count !== 1 ? 's' : ''}\\n\\nClick OK to view quest details.`);
                            document.querySelector('[data-page="quests"]').click();
                        }
                    },
                    plugins: {
                        legend: {
                            display: hasData,
                            position: 'bottom',
                            labels: {
                                padding: window.innerWidth <= 480 ? 6 : 8,
                                font: { size: window.innerWidth <= 480 ? 9 : 10 },
                                boxWidth: window.innerWidth <= 480 ? 10 : 12,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            },
                            onHover: (event) => {
                                event.native.target.style.cursor = 'pointer';
                            },
                            onLeave: (event) => {
                                event.native.target.style.cursor = 'default';
                            },
                            onClick: (event, legendItem, legend) => {
                                const index = legendItem.index;
                                const chart = legend.chart;
                                const meta = chart.getDatasetMeta(0);
                                meta.data[index].hidden = !meta.data[index].hidden;
                                chart.update();
                            }
                        },
                        tooltip: { 
                            enabled: hasData,
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            padding: window.innerWidth <= 480 ? 10 : 12,
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            cornerRadius: 8,
                            titleFont: {
                                size: window.innerWidth <= 480 ? 11 : 13,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: window.innerWidth <= 480 ? 10 : 12
                            },
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value} (${percentage}%)`;
                                },
                                afterLabel: function(context) {
                                    return 'Click to view details';
                                }
                            }
                        }
                    }
                }
            });
        }
    
        // User registrations chart (last 7 days)
        const userCtx = document.getElementById('userChart');
        if (userCtx) {
            destroyChart('userChart');
            
            const last7Days = [];
            const counts = [];
            const todayDate = new Date();
            
            // Generate last 7 days labels
            for (let i = 6; i >= 0; i--) {
                const date = new Date(todayDate);
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                const nextDay = new Date(date);
                nextDay.setDate(nextDay.getDate() + 1);
                
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                last7Days.push(dayName);
                
                const count = allUsers.filter(u => {
                    if (!u.created_at) return false;
                    const createdDate = new Date(u.created_at);
                    return createdDate >= date && createdDate < nextDay;
                }).length;
                counts.push(count);
            }
            
            chartInstances['userChart'] = new Chart(userCtx, {
                type: 'line',
                data: {
                    labels: last7Days,
                    datasets: [{
                        label: 'New Users',
                        data: counts,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 7,
                        pointBackgroundColor: '#6366f1',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#6366f1',
                        pointHoverBorderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                        axis: 'x'
                    },
                    onHover: (event, activeElements) => {
                        if (event.native && event.native.target) {
                            event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
                        }
                    },
                    onClick: (event, activeElements) => {
                        if (activeElements.length > 0) {
                            const index = activeElements[0].index;
                            const day = last7Days[index];
                            const count = counts[index];
                            alert(`${day}: ${count} new user${count !== 1 ? 's' : ''} registered`);
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeInOutQuart',
                        x: {
                            type: 'number',
                            easing: 'linear',
                            duration: 1500,
                            from: 0
                        },
                        y: {
                            type: 'number',
                            easing: 'easeInOutQuart',
                            duration: 1500,
                            from: 0
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                precision: 0,
                                font: {
                                    size: window.innerWidth <= 480 ? 9 : 11
                                }
                            },
                            grid: {
                                display: true,
                                drawBorder: false,
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            ticks: {
                                font: {
                                    size: window.innerWidth <= 480 ? 9 : 11
                                },
                                maxRotation: window.innerWidth <= 480 ? 45 : 0,
                                minRotation: window.innerWidth <= 480 ? 45 : 0
                            },
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            padding: window.innerWidth <= 480 ? 10 : 12,
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            cornerRadius: 8,
                            titleFont: {
                                size: window.innerWidth <= 480 ? 11 : 13,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: window.innerWidth <= 480 ? 10 : 12
                            },
                            displayColors: true,
                            boxWidth: window.innerWidth <= 480 ? 8 : 10,
                            boxHeight: window.innerWidth <= 480 ? 8 : 10,
                            usePointStyle: true,
                            callbacks: {
                                title: function(context) {
                                    return `Day: ${context[0].label}`;
                                },
                                label: function(context) {
                                    return `New Registrations: ${context.parsed.y}`;
                                },
                                afterLabel: function() {
                                    return 'Click for details';
                                }
                            }
                        }
                    },
                    layout: {
                        padding: {
                            top: 10,
                            bottom: 10
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Error loading dashboard data. Check console for details.');
    }
}

// Calculate stats manually if view doesn't exist
async function calculateStatsManually() {
    const { data, error } = await supabase
        .from('player_progress')
        .select('*');
    
    if (!error && data) {
        const totalCompletions = data.reduce((sum, p) => {
            return sum + (p.ced_finish ? 1 : 0) + (p.cec_finish ? 1 : 0) + 
                   (p.cos_finish ? 1 : 0) + (p.cbm_finish ? 1 : 0) + 
                   (p.cah_finish ? 1 : 0) + (p.sangay_finish ? 1 : 0) + 
                   (p.sanjose_finish ? 1 : 0);
        }, 0);
        
        document.getElementById('completed-quests').textContent = totalCompletions;
        
        const avgQuests = data.reduce((sum, p) => sum + (p.finish_quest_count || 0), 0) / data.length;
        document.getElementById('avg-playtime').textContent = avgQuests.toFixed(1) + ' quests';
    }
}

// Users
async function loadUsers() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading users...</td></tr>';
    
    try {
        // Try to use the get_all_users function first (includes auth.users)
        let { data: usersData, error: funcError } = await supabase
            .rpc('get_all_users');
        
        console.log('RPC get_all_users result:', usersData, 'Error:', funcError);
        
        // If function doesn't exist, fall back to player_progress
        if (funcError) {
            console.log('get_all_users function error, using player_progress:', funcError.message);
            const { data: progressData, error: progressError } = await supabase
                .from('player_progress')
                .select('*')
                .order('created_at', { ascending: false });
            
            console.log('player_progress result:', progressData, 'Error:', progressError);
            
            if (progressError) throw progressError;
            
            usersData = (progressData || []).map(p => ({
                id: p.id,
                email: null,
                username: null,
                created_at: p.created_at,
                last_sign_in_at: p.last_played,
                ced_finish: p.ced_finish,
                cec_finish: p.cec_finish,
                cos_finish: p.cos_finish,
                cbm_finish: p.cbm_finish,
                cah_finish: p.cah_finish,
                sangay_finish: p.sangay_finish,
                sanjose_finish: p.sanjose_finish,
                finish_quest_count: p.finish_quest_count
            }));
        }
        
        // Handle null/undefined data
        if (!usersData || usersData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No users found. Make sure get_all_users function is created in Supabase.</td></tr>';
            return;
        }
        
        const users = usersData.map(user => {
            const questCount = [
                user.ced_finish,
                user.cec_finish,
                user.cos_finish,
                user.cbm_finish,
                user.cah_finish,
                user.sangay_finish,
                user.sanjose_finish
            ].filter(Boolean).length;
            
            const shortId = user.id ? user.id.substring(0, 8) : 'unknown';
            
            return {
                id: user.id,
                email: user.email || `user_${shortId}@parsu`,
                username: user.username || `Player ${shortId}`,
                registered: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
                lastLogin: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never',
                questsCompleted: questCount
            };
        });
        
        console.log('Processed users:', users);
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No users found</td></tr>';
            return;
        }
        
        tbody.innerHTML = users.map((user, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.registered}</td>
                <td>${user.lastLogin}</td>
                <td><span class="badge badge-${user.questsCompleted > 4 ? 'success' : 'warning'}">${user.questsCompleted}/7</span></td>
                <td>
                    <button class="btn-action btn-danger" data-user-id="${user.id}" onclick="showDeleteUserModal('${user.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="loading" style="color: red;">Error loading users. Check console.</td></tr>';
    }
}

// Quests
async function loadQuests() {
    const container = document.getElementById('quest-stats-container');
    container.innerHTML = '<p class="loading">Loading quest data...</p>';
    
    try {
        // Try to get all users first using the RPC function
        let { data: usersData, error: funcError } = await supabase
            .rpc('get_all_users');
        
        // If function doesn't exist, fall back to player_progress
        if (funcError) {
            console.log('Using player_progress for quests');
            const { data: progressData, error } = await supabase
                .from('player_progress')
                .select('*');
            
            if (error) throw error;
            usersData = progressData;
        }
        
        const totalUsers = usersData ? usersData.length : 0;
        
        if (totalUsers === 0) {
            container.innerHTML = '<p class="loading">No users found. Run the SQL function in Supabase.</p>';
            return;
        }
        
        const quests = [
            { name: 'CED Quest', field: 'ced_finish', icon: 'building' },
            { name: 'CEC Quest', field: 'cec_finish', icon: 'computer' },
            { name: 'COS Quest', field: 'cos_finish', icon: 'science' },
            { name: 'CBM Quest', field: 'cbm_finish', icon: 'chart' },
            { name: 'CAH Quest', field: 'cah_finish', icon: 'palette' },
            { name: 'Sangay Quest', field: 'sangay_finish', icon: 'mountain' },
            { name: 'San Jose Quest', field: 'sanjose_finish', icon: 'tree' }
        ];
        
        container.innerHTML = quests.map(quest => {
            const completed = usersData.filter(p => p[quest.field]).length;
            const percentage = totalUsers > 0 ? ((completed / totalUsers) * 100).toFixed(0) : 0;
            return `
                <div class="quest-card">
                    <h3>${getIcon(quest.icon)} ${quest.name}</h3>
                    <div class="quest-stats-row">
                        <span class="quest-count">${completed}</span>
                        <h4 class="quest-total">/ ${totalUsers} users</h4>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="quest-percentage">${percentage}%</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading quests:', error);
        container.innerHTML = '<p style="color: red;">Error loading quest data</p>';
    }
}

// Analytics
async function loadAnalytics() {
    try {
        // Try to get all users using RPC function
        let { data: usersData, error: funcError } = await supabase
            .rpc('get_all_users');
        
        // If function doesn't exist, fall back to player_progress
        if (funcError) {
            console.log('Using player_progress for analytics');
            const { data: progressData, error } = await supabase
                .from('player_progress')
                .select('*');
            
            if (error) throw error;
            usersData = progressData || [];
        }
        
        if (!usersData) usersData = [];
        
        // Calculate peak hours from last_played or last_sign_in_at timestamps
        const hourCounts = [0, 0, 0, 0];
        usersData.forEach(p => {
            const timestamp = p.last_played || p.last_sign_in_at;
            if (timestamp) {
                const hour = new Date(timestamp).getHours();
                if (hour >= 0 && hour < 6) hourCounts[0]++;
                else if (hour >= 6 && hour < 12) hourCounts[1]++;
                else if (hour >= 12 && hour < 18) hourCounts[2]++;
                else hourCounts[3]++;
            }
        });
        
        const ctx = document.getElementById('peakHoursChart');
        if (ctx) {
            destroyChart('peakHoursChart');
            chartInstances['peakHoursChart'] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['12AM-6AM', '6AM-12PM', '12PM-6PM', '6PM-12AM'],
                    datasets: [{
                        label: 'Active Users',
                        data: hourCounts,
                        backgroundColor: ['#818cf8', '#6366f1', '#4f46e5', '#4338ca'],
                        hoverBackgroundColor: ['#6366f1', '#4f46e5', '#4338ca', '#3730a3'],
                        borderRadius: 6,
                        borderWidth: 0,
                        hoverBorderWidth: 2,
                        hoverBorderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    onHover: (event, activeElements) => {
                        event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
                    },
                    onClick: (event, activeElements) => {
                        if (activeElements.length > 0) {
                            const index = activeElements[0].index;
                            const timeRange = ['12AM-6AM', '6AM-12PM', '12PM-6PM', '6PM-12AM'][index];
                            const count = hourCounts[index];
                            const total = hourCounts.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                            alert(`Peak Hours Analysis\\n\\nTime: ${timeRange}\\nActive Users: ${count}\\nPercentage: ${percentage}%`);
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeInOutQuart',
                        y: {
                            type: 'number',
                            easing: 'easeInOutQuart',
                            duration: 1500,
                            from: 0
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            padding: window.innerWidth <= 480 ? 10 : 12,
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            cornerRadius: 8,
                            titleFont: {
                                size: window.innerWidth <= 480 ? 11 : 13,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: window.innerWidth <= 480 ? 10 : 12
                            },
                            displayColors: true,
                            boxWidth: window.innerWidth <= 480 ? 8 : 10,
                            boxHeight: window.innerWidth <= 480 ? 8 : 10,
                            callbacks: {
                                title: function(context) {
                                    return `Time Range: ${context[0].label}`;
                                },
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0;
                                    return [
                                        `Active Users: ${context.parsed.y}`,
                                        `Percentage: ${percentage}%`
                                    ];
                                },
                                afterLabel: function() {
                                    return 'Click for details';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                font: { size: window.innerWidth <= 480 ? 9 : 11 }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        x: {
                            ticks: {
                                font: { size: window.innerWidth <= 480 ? 8 : 10 },
                                maxRotation: window.innerWidth <= 480 ? 45 : 0,
                                minRotation: window.innerWidth <= 480 ? 45 : 0
                            },
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }
        
        // Popular quests with icons
        const questCompletions = [
            { name: 'CED Quest', icon: 'building', count: usersData.filter(p => p.ced_finish).length },
            { name: 'CEC Quest', icon: 'computer', count: usersData.filter(p => p.cec_finish).length },
            { name: 'COS Quest', icon: 'science', count: usersData.filter(p => p.cos_finish).length },
            { name: 'CBM Quest', icon: 'chart', count: usersData.filter(p => p.cbm_finish).length },
            { name: 'CAH Quest', icon: 'palette', count: usersData.filter(p => p.cah_finish).length },
            { name: 'Sangay Quest', icon: 'mountain', count: usersData.filter(p => p.sangay_finish).length },
            { name: 'San Jose Quest', icon: 'tree', count: usersData.filter(p => p.sanjose_finish).length }
        ].sort((a, b) => b.count - a.count);
        
        const popularQuests = document.getElementById('popular-quests');
        // Remove fade-in class if present to allow retrigger
        // Remove all children to reset animation
        while (popularQuests.firstChild) {
            popularQuests.removeChild(popularQuests.firstChild);
        }
        // Create the list container
        const list = document.createElement('div');
        list.className = 'popular-quests-list';
        // Add each item with staggered animation delay
        questCompletions.forEach((q, i) => {
            const item = document.createElement('div');
            item.className = 'popular-quest-item';
            item.style.animationDelay = `${i * 0.12 + 0.1}s`;
            item.innerHTML = `
                <span class="quest-rank">#${i + 1}</span>
                <h4 class="quest-icon">${getIcon(q.icon)}</h4>
                <h4 class="quest-name">${q.name}</h4>
                <span class="quest-badge">${q.count}</span>
            `;
            list.appendChild(item);
        });
        popularQuests.appendChild(list);
    } catch (error) {
        console.error('Error loading analytics:', error);
        document.getElementById('popular-quests').innerHTML = '<p style="color: red; font-size: 12px;">Error loading data</p>';
    }
}

// Logs
async function loadLogs() {
    const container = document.getElementById('logs-container');
    container.innerHTML = '<div class="log-entry"><span class="log-time">Loading logs...</span></div>';
    
    try {
        // Try to get all users using RPC function
        let { data: usersData, error: funcError } = await supabase.rpc('get_all_users');
        
        // Fallback to player_progress if function doesn't exist
        if (funcError) {
            console.log('Using player_progress for logs:', funcError.message);
            const { data: progressData, error } = await supabase
                .from('player_progress')
                .select('*')
                .order('last_played', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            usersData = (progressData || []).map(p => ({
                ...p,
                email: null,
                username: null,
                last_sign_in_at: p.last_played
            }));
        }
        
        if (!usersData || usersData.length === 0) {
            container.innerHTML = '<div class="log-entry"><span class="log-message">No activity logs available</span></div>';
            return;
        }
        
        const logs = [];
        
        usersData.forEach(user => {
            const shortId = user.id ? user.id.substring(0, 8) : 'unknown';
            const username = user.username || user.email || `Player ${shortId}`;
            
            // Registration event
            if (user.created_at) {
                logs.push({
                    time: new Date(user.created_at),
                    timeStr: new Date(user.created_at).toLocaleString(),
                    message: `New user registered: ${username}`,
                    type: 'registration',
                    icon: '<svg class="icon" fill="currentColor" viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'
                });
            }
            
            // Last sign in event
            if (user.last_sign_in_at) {
                logs.push({
                    time: new Date(user.last_sign_in_at),
                    timeStr: new Date(user.last_sign_in_at).toLocaleString(),
                    message: `${username} signed in`,
                    type: 'login',
                    icon: '<svg class="icon" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>'
                });
            }
            
            // Quest completion events (if they have completed any)
            const questCount = (user.ced_finish ? 1 : 0) + (user.cec_finish ? 1 : 0) + 
                              (user.cos_finish ? 1 : 0) + (user.cbm_finish ? 1 : 0) + 
                              (user.cah_finish ? 1 : 0) + (user.sangay_finish ? 1 : 0) + 
                              (user.sanjose_finish ? 1 : 0);
            
            if (questCount > 0 && user.last_played) {
                logs.push({
                    time: new Date(user.last_played),
                    timeStr: new Date(user.last_played).toLocaleString(),
                    message: `${username} completed ${questCount} quest${questCount > 1 ? 's' : ''}`,
                    type: 'quest',
                    icon: '<svg class="icon" fill="currentColor" viewBox="0 0 24 24"><path d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z"/></svg>'
                });
            }
        });
        
        // Sort by time descending
        logs.sort((a, b) => b.time - a.time);
        
        if (logs.length === 0) {
            container.innerHTML = '<div class="log-entry"><span class="log-message">No activity logs available</span></div>';
            return;
        }
        
        container.innerHTML = logs.slice(0, 50).map(log => `
            <div class="log-entry log-${log.type}">
                <div class="log-header">
                    <span class="log-icon">${log.icon}</span>
                    <span class="log-time">${log.timeStr}</span>
                </div>
                <span class="log-message">${log.message}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading logs:', error);
        container.innerHTML = '<div class="log-entry" style="color: red;"><span class="log-message">Error loading logs</span></div>';
    }
}

// Helper functions
async function viewUser(userId) {
    try {
        const { data, error } = await supabase
            .from('player_progress')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        const quests = [
            `CED: ${data.ced_finish ? '✅' : '❌'}`,
            `CEC: ${data.cec_finish ? '✅' : '❌'}`,
            `COS: ${data.cos_finish ? '✅' : '❌'}`,
            `CBM: ${data.cbm_finish ? '✅' : '❌'}`,
            `CAH: ${data.cah_finish ? '✅' : '❌'}`,
            `Sangay: ${data.sangay_finish ? '✅' : '❌'}`,
            `San Jose: ${data.sanjose_finish ? '✅' : '❌'}`
        ].join('\n');
        
        alert(`User Details:\n\nTotal Quests Completed: ${data.finish_quest_count}\n\nQuest Status:\n${quests}\n\nLast Played: ${new Date(data.last_played).toLocaleString()}\nRegistered: ${new Date(data.created_at).toLocaleString()}`);
    } catch (error) {
        console.error('Error viewing user:', error);
        alert('Error loading user details');
    }
}

// Delete user modal logic
let userIdToDelete = null;
function showDeleteUserModal(userId) {
    userIdToDelete = userId;
    const modal = document.getElementById('delete-modal-overlay');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            const confirmBtn = document.getElementById('confirm-delete-btn');
            if (confirmBtn) confirmBtn.focus();
        }, 50);
    }
}

async function deleteUser(userId) {
    try {
        // Call the delete_user RPC function
        const { data, error } = await supabase
            .rpc('delete_user', { user_id: userId });
        // Optionally handle error UI here
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
    }
}

// Modal event listeners for delete confirmation
document.getElementById('confirm-delete-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('delete-modal-overlay');
    if (modal) modal.style.display = 'none';
    if (userIdToDelete) {
        deleteUser(userIdToDelete);
        userIdToDelete = null;
    }
});
document.getElementById('cancel-delete-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('delete-modal-overlay');
    if (modal) modal.style.display = 'none';
    userIdToDelete = null;
});

// Refresh buttons
document.getElementById('refresh-users')?.addEventListener('click', loadUsers);
document.getElementById('refresh-logs')?.addEventListener('click', loadLogs);

// Search functionality
let allUsersData = [];
document.getElementById('user-search')?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const tbody = document.getElementById('users-table-body');
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
});

// Log filter
document.getElementById('log-filter')?.addEventListener('change', (e) => {
    const filter = e.target.value;
    const logs = document.querySelectorAll('.log-entry');
    logs.forEach(log => {
        const type = log.classList.contains('log-login') ? 'logins' :
                     log.classList.contains('log-quest') ? 'quest' :
                     log.classList.contains('log-registration') ? 'registration' : '';
        if (filter === 'all') {
            log.style.display = '';
        } else if (filter === type) {
            log.style.display = '';
        } else {
            log.style.display = 'none';
        }
    });
});

// Logout handler removed here; logout is handled by the modal in index.html
// (modal opens on click and calls logout() when confirmed)

// Mobile menu toggle
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function toggleSidebar() {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
    document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
}

function closeSidebar() {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

if (mobileMenuToggle && sidebar && sidebarOverlay) {
    // Toggle sidebar on menu button click
    mobileMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });
    
    // Close sidebar when clicking overlay
    sidebarOverlay.addEventListener('click', closeSidebar);
    
    // Close sidebar when clicking on a nav item on mobile
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
    
    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        // Close sidebar on window resize if screen becomes larger
        if (window.innerWidth > 768) {
            closeSidebar();
        }
        
        // Debounce chart re-rendering on resize
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const activePage = document.querySelector('.page.active');
            if (activePage) {
                const pageId = activePage.id.replace('-page', '');
                // Reload current page to update charts with new responsive settings
                if (pageId === 'dashboard' || pageId === 'analytics') {
                    loadPageData(pageId);
                }
            }
        }, 300);
    });
}

// Theme Toggle Functionality
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');
    
    // Check for saved theme preference or default to light mode
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    // Apply the theme on load
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }
    
    // Toggle theme on button click
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        
        const isDark = document.body.classList.contains('dark-mode');
        
        // Toggle icons
        if (isDark) {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
            localStorage.setItem('theme', 'dark');
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
            localStorage.setItem('theme', 'light');
        }
    });
}

// Parallax scroll effect for mobile cards
function initParallaxScroll() {
    // Only apply on mobile devices
    if (window.innerWidth <= 768) {
        const mainContent = document.querySelector('.main-content');
        const cards = document.querySelectorAll('.stat-card, .chart-card, .quest-card, .analytics-card');
        
        if (!mainContent || cards.length === 0) return;
        
        let ticking = false;
        
        function updateParallax() {
            const scrollTop = mainContent.scrollTop;
            const windowHeight = window.innerHeight;
            
            cards.forEach((card) => {
                const rect = card.getBoundingClientRect();
                const cardTop = rect.top;
                const cardHeight = rect.height;
                
                // Calculate if card is in viewport
                if (cardTop < windowHeight && cardTop + cardHeight > 0) {
                    // Calculate parallax offset (subtle movement)
                    const scrollProgress = (windowHeight - cardTop) / (windowHeight + cardHeight);
                    const translateY = (scrollProgress - 0.5) * 20; // Max 10px movement up or down
                    const scale = 0.95 + (scrollProgress * 0.05); // Scale from 0.95 to 1.0
                    
                    card.style.transform = `translateY(${translateY}px) scale(${Math.min(scale, 1)})`;
                    card.style.opacity = Math.min(scrollProgress + 0.3, 1);
                } else {
                    // Reset when out of view
                    card.style.transform = 'translateY(0) scale(0.95)';
                    card.style.opacity = '0.3';
                }
            });
            
            ticking = false;
        }
        
        mainContent.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    updateParallax();
                    ticking = false;
                });
                ticking = true;
            }
        });
        
        // Initial update
        updateParallax();
    }
}

// Auto logout when window/tab is closed
window.addEventListener('beforeunload', () => {
    // Clear session data on exit
    try {
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminLoginTime');
        localStorage.removeItem('adminEmail');
    } catch (e) {
        console.warn('Error clearing session on exit', e);
    }
});

// Initial authentication check
if (checkAuth()) {
    initDashboard();
    initThemeToggle();
    initParallaxScroll();
}
