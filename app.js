// ============================================
// CẤU HÌNH KẾT NỐI BACKEND (THAY LINK CỦA BẠN VÀO ĐÂY)
// ============================================
const API_BASE = "https://myyoutube-backend.nyaochen9.workers.dev"; 

// Các phần tử HTML
const youtubeUrlInput = document.getElementById('youtubeUrl');
const getInfoBtn = document.getElementById('getInfoBtn');
const loadingDiv = document.getElementById('loading');
const resultDiv = document.getElementById('result');

// Biến toàn cục
let fullVideoData = null;
let currentUser = null;

// ============================================
// 1. QUẢN LÝ ĐĂNG NHẬP & BẢO MẬT
// ============================================

window.addEventListener('load', () => {
    const token = localStorage.getItem('user_token');
    const userData = localStorage.getItem('user_data');
    if (!token || !userData) {
        showAuthModal();
    } else {
        currentUser = JSON.parse(userData);
        updateUIForLoggedInUser();
    }
});

function showAuthModal() {
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.innerHTML = `
        <div class="auth-container">
            <h2 style="color:#ff0000"><i class="fab fa-youtube"></i> HỆ THỐNG TRA CỨU</h2>
            <p>Vui lòng đăng nhập để sử dụng (Dùng thử 3 ngày miễn phí)</p>
            <input type="text" id="login-user" placeholder="Tên đăng nhập">
            <input type="password" id="login-pass" placeholder="Mật khẩu">
            <div class="auth-btns">
                <button onclick="handleLogin()" class="btn-primary">ĐĂNG NHẬP</button>
                <button onclick="handleRegister()" class="btn-secondary">ĐĂNG KÝ MỚI</button>
            </div>
            <div id="auth-msg" style="margin-top:10px; color:red; font-size:14px"></div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function handleRegister() {
    const u = document.getElementById('login-user').value;
    const p = document.getElementById('login-pass').value;
    if(!u || !p) return alert("Vui lòng nhập đủ!");
    try {
        const res = await fetch(`${API_BASE}/api/register`, {
            method: 'POST',
            body: JSON.stringify({username: u, password: p})
        });
        const data = await res.json();
        if(res.ok) alert("Đăng ký thành công! Hãy nhấn Đăng nhập.");
        else alert(data.error);
    } catch(e) { alert("Lỗi kết nối Backend!"); }
}

async function handleLogin() {
    const u = document.getElementById('login-user').value;
    const p = document.getElementById('login-pass').value;
    try {
        const res = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            body: JSON.stringify({username: u, password: p})
        });
        const data = await res.json();
        if(res.ok) {
            localStorage.setItem('user_token', data.token);
            localStorage.setItem('user_data', JSON.stringify(data.user));
            location.reload();
        } else {
            document.getElementById('auth-msg').innerText = data.error;
        }
    } catch(e) { alert("Lỗi kết nối Backend!"); }
}

function handleLogout() {
    localStorage.clear();
    location.reload();
}

function updateUIForLoggedInUser() {
    const header = document.querySelector('.header');
    const logoutBtn = document.createElement('button');
    logoutBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> Thoát (${currentUser.username})`;
    logoutBtn.className = "btn-logout";
    logoutBtn.onclick = handleLogout;
    header.appendChild(logoutBtn);
}

// ============================================
// 2. HÀM XỬ LÝ DỮ LIỆU CHÍNH (GIỮ NGUYÊN TỪ BẢN CŨ)
// ============================================

function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([^&]+)/,
        /(?:youtu\.be\/)([^?]+)/,
        /(?:youtube\.com\/embed\/)([^?]+)/,
        /(?:youtube\.com\/v\/)([^?]+)/,
        /(?:youtube\.com\/shorts\/)([^?]+)/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

function formatDate(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

function formatNumber(num) {
    if (!num) return '0';
    const number = parseInt(num);
    if (number >= 1000000) return (number / 1000000).toFixed(1) + ' triệu';
    if (number >= 1000) return (number / 1000).toFixed(1) + ' nghìn';
    return number.toLocaleString('vi-VN');
}

function formatDuration(isoDuration) {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    let result = [];
    if (hours > 0) result.push(`${hours} giờ`);
    if (minutes > 0) result.push(`${minutes} phút`);
    if (seconds > 0) result.push(`${seconds} giây`);
    return result.join(' ') || '0 giây';
}

function parseDurationToSeconds(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    return (parseInt(match[1] || 0) * 3600) + (parseInt(match[2] || 0) * 60) + parseInt(match[3] || 0);
}

// ============================================
// 3. HÀM LẤY THÔNG TIN TỪ WORKER
// ============================================

async function fetchAllVideoInfo(videoId) {
    const token = localStorage.getItem('user_token');
    const response = await fetch(`${API_BASE}/api/get-info?videoId=${videoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 403) {
        const err = await response.json();
        throw new Error("EXPIRED:" + err.message);
    }
    if (!response.ok) throw new Error("Lỗi kết nối Server");

    const data = await response.json();
    if (!data.items || data.items.length === 0) throw new Error('Video không tồn tại');
    return data.items[0];
}

// ============================================
// 4. PHÂN TÍCH & HIỂN THỊ (GIỮ NGUYÊN TOÀN BỘ GIAO DIỆN CŨ)
// ============================================

function analyzeVideoData(videoData, categoryName) {
    const snippet = videoData.snippet || {};
    const stats = videoData.statistics || {};
    const content = videoData.contentDetails || {};
    const status = videoData.status || {};
    
    const views = parseInt(stats.viewCount || 0);
    const likes = parseInt(stats.likeCount || 0);
    const comments = parseInt(stats.commentCount || 0);
    const durationSec = parseDurationToSeconds(content.duration);
    const publishedDate = new Date(snippet.publishedAt);
    const diffDays = Math.ceil(Math.abs(new Date() - publishedDate) / (1000 * 60 * 60 * 24)) || 1;

    return {
        basic: {
            title: snippet.title,
            description: snippet.description,
            videoId: videoData.id,
            channelTitle: snippet.channelTitle,
            publishedAtFormatted: formatDate(snippet.publishedAt),
            thumbnails: snippet.thumbnails
        },
        statistics: {
            viewCount: formatNumber(views),
            viewCountRaw: views,
            likeCount: formatNumber(likes),
            likeCountRaw: likes,
            commentCount: formatNumber(comments),
            commentCountRaw: comments
        },
        contentDetails: {
            durationFormatted: formatDuration(content.duration),
            definition: content.definition.toUpperCase(),
            caption: content.caption === 'true' ? 'Có' : 'Không',
            dimension: content.dimension.toUpperCase()
        },
        status: {
            privacyStatus: status.privacyStatus === 'public' ? 'Công khai' : 'Riêng tư',
            license: status.license === 'youtube' ? 'YouTube Standard' : 'Creative Commons',
            madeForKids: status.madeForKids ? 'Dành cho trẻ em' : 'Mọi lứa tuổi'
        },
        categorization: {
            categoryName: categoryName,
            tags: snippet.tags || [],
            tagCount: (snippet.tags || []).length
        },
        analysis: {
            engagement: {
                likeRate: views > 0 ? ((likes / views) * 100).toFixed(2) + '%' : '0%',
                commentRate: views > 0 ? ((comments / views) * 100).toFixed(4) + '%' : '0%',
                popularityScore: Math.round(((views / diffDays) * 0.7 + ((likes + comments) / views) * 30) * 100) / 100
            },
            seo: {
                titleLength: snippet.title.length,
                descriptionWordCount: snippet.description.split(' ').length,
                tagDensity: snippet.description ? (( (snippet.tags || []).join(' ').length / snippet.description.length ) * 100).toFixed(2) + '%' : '0%'
            },
            age: {
                daysOld: diffDays,
                ageDescription: diffDays < 30 ? 'Video mới' : 'Video cũ'
            }
        }
    };
}

// --- CÁC HÀM TẠO GIAO DIỆN TABS (COPY TỪ CODE GỐC CỦA BẠN) ---

function createTabInterface(videoInfo) {
    return `
        <div class="tabs-container">
            <div class="tabs-header">
                <button class="tab-btn active" data-tab="overview"><i class="fas fa-eye"></i> Tổng quan</button>
                <button class="tab-btn" data-tab="details"><i class="fas fa-info-circle"></i> Chi tiết</button>
                <button class="tab-btn" data-tab="statistics"><i class="fas fa-chart-bar"></i> Thống kê</button>
                <button class="tab-btn" data-tab="analysis"><i class="fas fa-chart-line"></i> Phân tích</button>
            </div>
            <div class="tabs-content">
                <div class="tab-pane active" id="overview-tab">${createOverviewTab(videoInfo)}</div>
                <div class="tab-pane" id="details-tab">${createDetailsTab(videoInfo)}</div>
                <div class="tab-pane" id="statistics-tab">${createStatisticsTab(videoInfo)}</div>
                <div class="tab-pane" id="analysis-tab">${createAnalysisTab(videoInfo)}</div>
            </div>
        </div>
    `;
}

function createOverviewTab(v) {
    return `
        <div class="overview-grid">
            <div class="video-preview">
                <img src="${v.basic.thumbnails.high.url}" style="width:100%; border-radius:12px">
                <button onclick="window.open('https://youtube.com/watch?v=${v.basic.videoId}')" class="btn-watch">Xem trên YouTube</button>
            </div>
            <div class="basic-info">
                <h2>${v.basic.title}</h2>
                <div class="info-grid">
                    <div class="info-card"><h4>Kênh</h4><p>${v.basic.channelTitle}</p></div>
                    <div class="info-card"><h4>Ngày đăng</h4><p>${v.basic.publishedAtFormatted}</p></div>
                    <div class="info-card"><h4>Thời lượng</h4><p>${v.contentDetails.durationFormatted}</p></div>
                    <div class="info-card"><h4>Danh mục</h4><p>${v.categorization.categoryName}</p></div>
                </div>
                <div class="quick-stats">
                    <div class="stat"><span>${v.statistics.viewCount}</span><small>Lượt xem</small></div>
                    <div class="stat"><span>${v.statistics.likeCount}</span><small>Lượt thích</small></div>
                    <div class="stat"><span>${v.statistics.commentCount}</span><small>Bình luận</small></div>
                </div>
            </div>
        </div>
        <div class="description-box"><h3>Mô tả</h3><p>${v.basic.description.replace(/\n/g, '<br>')}</p></div>
    `;
}

// Các hàm tab khác (Details, Statistics, Analysis) bạn hãy copy y hệt từ file app.js cũ của bạn vào đây.

// ============================================
// 5. KHỞI CHẠY HÀM CHÍNH
// ============================================

async function getFullVideoInfo() {
    const url = youtubeUrlInput.value.trim();
    const videoId = extractVideoId(url);
    if (!videoId) return alert("URL không hợp lệ");

    loadingDiv.style.display = 'block';
    resultDiv.style.display = 'none';

    try {
        const videoData = await fetchAllVideoInfo(videoId);
        fullVideoData = videoData;
        const analyzedData = analyzeVideoData(videoData, "Danh mục " + videoData.snippet.categoryId);

        loadingDiv.style.display = 'none';
        resultDiv.innerHTML = createTabInterface(analyzedData);
        resultDiv.style.display = 'block';
        initTabs();
    } catch (e) {
        loadingDiv.style.display = 'none';
        if (e.message.startsWith("EXPIRED:")) showPaymentUI(e.message.replace("EXPIRED:", ""));
        else alert(e.message);
    }
}

function showPaymentUI(msg) {
    resultDiv.innerHTML = `
        <div class="error" style="text-align:center; padding:40px; background:#fff9e6; border-radius:20px; border:2px solid #ffc107">
            <h2 style="color:#856404"><i class="fas fa-lock"></i> TÀI KHOẢN HẾT HẠN</h2>
            <p>${msg}</p>
            <div class="payment-cards" style="display:flex; gap:20px; justify-content:center; margin-top:20px">
                <div style="background:white; padding:20px; border-radius:15px; border:2px solid #ff0000; width:150px">
                    <h3>35k</h3><p>1 Tháng</p>
                </div>
                <div style="background:white; padding:20px; border-radius:15px; border:2px solid #ff0000; width:150px">
                    <h3>350k</h3><p>1 Năm</p>
                </div>
            </div>
            <p style="margin-top:20px">Nội dung CK: <b>Gia han ${currentUser.username}</b></p>
            <p>Ngân hàng MB: <b>123456789</b></p>
        </div>
    `;
    resultDiv.style.display = 'block';
}

function initTabs() {
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(btn => {
        btn.onclick = () => {
            btns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
        };
    });
}

getInfoBtn.addEventListener('click', getFullVideoInfo);
