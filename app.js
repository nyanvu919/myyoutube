// ============================================
// YOUTUBE FULL INFO EXTRACTOR - BẢN BẢO MẬT BACKEND
// ============================================

// 0. CẤU HÌNH BACKEND (THAY LINK WORKER CỦA BẠN TẠI ĐÂY)
const API_BASE = "https://myyoutube-backend.nyaochen9.workers.dev"; 

// Lấy các phần tử HTML
const youtubeUrlInput = document.getElementById('youtubeUrl');
const getInfoBtn = document.getElementById('getInfoBtn');
const loadingDiv = document.getElementById('loading');
const resultDiv = document.getElementById('result');

// Biến toàn cục
let fullVideoData = null;
let currentUser = null;

// ============================================
// 1. HỆ THỐNG ĐĂNG NHẬP & BẢO MẬT (MỚI)
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
            <h2 style="color:#ff0000; margin-bottom:10px;"><i class="fab fa-youtube"></i> ĐĂNG NHẬP</h2>
            <p style="margin-bottom:20px;">Vui lòng đăng nhập để sử dụng công cụ.<br>(Tài khoản mới được tặng 3 ngày dùng thử)</p>
            <input type="text" id="login-user" placeholder="Tên đăng nhập">
            <input type="password" id="login-pass" placeholder="Mật khẩu">
            <div class="auth-btns">
                <button onclick="handleLogin()" class="btn-primary" style="width:100%; margin-bottom:10px;">ĐĂNG NHẬP</button>
                <button onclick="handleRegister()" style="width:100%; background:#666; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer;">ĐĂNG KÝ MỚI</button>
            </div>
            <div id="auth-msg" style="margin-top:15px; color:red; font-weight:bold;"></div>
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
            headers: {'Content-Type': 'application/json'},
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
            headers: {'Content-Type': 'application/json'},
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
    logoutBtn.style = "position:absolute; top:10px; right:10px; background:#444; color:white; border:none; padding:5px 15px; border-radius:5px; cursor:pointer;";
    logoutBtn.onclick = handleLogout;
    header.style.position = "relative";
    header.appendChild(logoutBtn);
}

// ============================================
// 2. HÀM XỬ LÝ URL & VIDEO ID (GIỮ NGUYÊN)
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
    if (url.includes('youtu.be/')) {
        return url.split('youtu.be/')[1].split('?')[0];
    }
    return null;
}

// ============================================
// 3. HÀM ĐỊNH DẠNG & CHUYỂN ĐỔI (GIỮ NGUYÊN)
// ============================================

function formatDate(isoDate) {
    const date = new Date(isoDate);
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' };
    return date.toLocaleDateString('vi-VN', options);
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
// 4. HÀM LẤY THÔNG TIN TỪ BACKEND WORKER (MỚI)
// ============================================

async function fetchFromWorker(path, params = "") {
    const token = localStorage.getItem('user_token');
    const response = await fetch(`${API_BASE}${path}${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.status === 403) {
        const err = await response.json();
        throw new Error("EXPIRED:" + err.message);
    }
    if (!response.ok) throw new Error("Lỗi kết nối server");
    return await response.json();
}

async function fetchAllVideoInfo(videoId) {
    const data = await fetchFromWorker("/api/get-info", `?videoId=${videoId}`);
    if (!data.items || data.items.length === 0) throw new Error('Video không tồn tại');
    return data.items[0];
}

// Vì Worker hiện tại trả về dữ liệu video gộp, ta sẽ giả lập Category Name từ ID 
// hoặc bạn có thể mở rộng Worker để lấy thêm snippet category.
async function fetchVideoCategory(categoryId) {
    return "Danh mục ID: " + categoryId; 
}

// ============================================
// 5. HÀM PHÂN TÍCH DỮ LIỆU (GIỮ NGUYÊN)
// ============================================

function calculatePopularityScore(views, likes, comments, daysOld) {
    if (daysOld === 0) daysOld = 1;
    const dailyViews = views / daysOld;
    const engagement = (likes + comments) / views * 100;
    return Math.round((dailyViews * 0.7 + engagement * 0.3) * 100) / 100;
}

function analyzeVideoData(videoData, categoryName, channelInfo) {
    const snippet = videoData.snippet || {};
    const stats = videoData.statistics || {};
    const content = videoData.contentDetails || {};
    const status = videoData.status || {};
    const topics = videoData.topicDetails || {};
    const recording = videoData.recordingDetails || {};
    const live = videoData.liveStreamingDetails || {};
    const localizations = videoData.localizations || {};
    
    const publishedDate = new Date(snippet.publishedAt);
    const now = new Date();
    const diffTime = Math.abs(now - publishedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const viewCount = parseInt(stats.viewCount || 0);
    const likeCount = parseInt(stats.likeCount || 0);
    const commentCount = parseInt(stats.commentCount || 0);
    
    const likeRate = viewCount > 0 ? ((likeCount / viewCount) * 100).toFixed(2) : 0;
    const commentRate = viewCount > 0 ? ((commentCount / viewCount) * 100).toFixed(4) : 0;
    const engagementRate = ((likeCount + commentCount) / viewCount * 100).toFixed(2);
    
    const durationSec = parseDurationToSeconds(content.duration);
    const durationType = durationSec < 60 ? 'Ngắn' : durationSec < 300 ? 'Trung bình' : durationSec < 600 ? 'Dài' : 'Rất dài';
    
    const tags = snippet.tags || [];
    const tagCount = tags.length;
    const tagDensity = snippet.description ? (tags.join(' ').length / snippet.description.length * 100).toFixed(2) : 0;
    
    return {
        basic: { title: snippet.title, description: snippet.description, videoId: videoData.id, channelTitle: snippet.channelTitle, channelId: snippet.channelId, publishedAt: snippet.publishedAt, publishedAtFormatted: formatDate(snippet.publishedAt), thumbnails: snippet.thumbnails || {} },
        statistics: { viewCount: formatNumber(stats.viewCount), viewCountRaw: viewCount, likeCount: formatNumber(stats.likeCount), likeCountRaw: likeCount, commentCount: formatNumber(stats.commentCount), commentCountRaw: commentCount, favoriteCount: formatNumber(stats.favoriteCount) },
        contentDetails: { duration: content.duration, durationFormatted: formatDuration(content.duration), durationSeconds: durationSec, durationType: durationType, dimension: content.dimension === '3d' ? '3D' : '2D', definition: content.definition === 'hd' ? 'HD (Chất lượng cao)' : 'SD (Chuẩn)', caption: content.caption === 'true' ? 'Có phụ đề' : 'Không có phụ đề', licensedContent: content.licensedContent ? 'Có bản quyền' : 'Không có bản quyền', projection: content.projection === '360' ? 'Video 360°' : 'Thông thường', hasCustomThumbnail: !!snippet.thumbnails?.maxres },
        status: { uploadStatus: status.uploadStatus || 'Không xác định', privacyStatus: status.privacyStatus === 'public' ? 'Công khai' : 'Riêng tư', license: status.license === 'youtube' ? 'YouTube Standard' : 'Creative Commons', embeddable: status.embeddable ? 'Có thể nhúng' : 'Không thể nhúng', publicStatsViewable: status.publicStatsViewable ? 'Hiện công khai' : 'Ẩn thống kê', madeForKids: status.madeForKids ? 'Video cho trẻ em' : 'Video cho mọi lứa tuổi' },
        categorization: { categoryId: snippet.categoryId, categoryName: categoryName, tags: tags, tagCount: tagCount, defaultLanguage: snippet.defaultLanguage || 'Không xác định', defaultAudioLanguage: snippet.defaultAudioLanguage || 'Không xác định' },
        topics: { topicCategories: topics.topicCategories || [], relevantTopicIds: topics.relevantTopicIds || [], topicCount: (topics.topicCategories || []).length },
        localizations: { availableLanguages: Object.keys(localizations).length, languages: Object.keys(localizations) },
        liveStreaming: live ? { actualStartTime: live.actualStartTime, wasLive: !!live.actualStartTime } : { wasLive: false },
        recordingDetails: recording.location ? { hasLocation: true } : { hasLocation: false },
        analysis: {
            age: { daysOld: diffDays, ageDescription: diffDays < 7 ? 'Video mới' : diffDays < 30 ? 'Video gần đây' : 'Video cũ' },
            engagement: { likeRate: `${likeRate}%`, commentRate: `${commentRate}%`, engagementRate: `${engagementRate}%`, popularityScore: calculatePopularityScore(viewCount, likeCount, commentCount, diffDays) },
            seo: { titleLength: snippet.title?.length || 0, descriptionLength: snippet.description?.length || 0, tagDensity: `${tagDensity}%`, hasTags: tagCount > 0, descriptionWordCount: snippet.description?.split(' ').length || 0 }
        },
        channel: channelInfo ? { channelTitle: channelInfo.snippet?.title, subscriberCount: formatNumber(channelInfo.statistics?.subscriberCount), videoCount: formatNumber(channelInfo.statistics?.videoCount), viewCount: formatNumber(channelInfo.statistics?.viewCount) } : null
    };
}

// ============================================
// 6. GIAO DIỆN TABS & RECOMMENDATIONS (GIỮ NGUYÊN)
// ============================================

function getRecommendations(videoInfo) {
    const recs = [];
    if (videoInfo.categorization.tagCount < 5) recs.push({ priority: 'high', icon: 'exclamation-triangle', title: 'Thêm nhiều tags hơn', description: `Video chỉ có ${videoInfo.categorization.tagCount} tags. YouTube khuyến nghị 10-15 tags.` });
    if (videoInfo.analysis.seo.descriptionWordCount < 150) recs.push({ priority: 'medium', icon: 'file-alt', title: 'Mở rộng mô tả', description: 'Mô tả quá ngắn. Thêm từ khóa để tăng SEO.' });
    if (videoInfo.contentDetails.caption === 'Không có phụ đề') recs.push({ priority: 'low', icon: 'closed-captioning', title: 'Thêm phụ đề', description: 'Video không có phụ đề. Thêm phụ đề để tăng SEO.' });
    if (recs.length === 0) recs.push({ priority: 'low', icon: 'check-circle', title: 'Video đã tối ưu tốt', description: 'Video của bạn đáp ứng tiêu chí tối ưu.' });
    return recs;
}

function createTabInterface(videoInfo) {
    return `
        <div class="tabs-container">
            <div class="tabs-header">
                <button class="tab-btn active" data-tab="overview"><i class="fas fa-eye"></i> Tổng quan</button>
                <button class="tab-btn" data-tab="details"><i class="fas fa-info-circle"></i> Chi tiết</button>
                <button class="tab-btn" data-tab="statistics"><i class="fas fa-chart-bar"></i> Thống kê</button>
                <button class="tab-btn" data-tab="analysis"><i class="fas fa-chart-line"></i> Phân tích</button>
                <button class="tab-btn" data-tab="rawdata"><i class="fas fa-code"></i> Dữ liệu gốc</button>
            </div>
            <div class="tabs-content">
                <div class="tab-pane active" id="overview-tab">${createOverviewTab(videoInfo)}</div>
                <div class="tab-pane" id="details-tab">${createDetailsTab(videoInfo)}</div>
                <div class="tab-pane" id="statistics-tab">${createStatisticsTab(videoInfo)}</div>
                <div class="tab-pane" id="analysis-tab">${createAnalysisTab(videoInfo)}</div>
                <div class="tab-pane" id="rawdata-tab">${createRawDataTab()}</div>
            </div>
        </div>
    `;
}

function createOverviewTab(v) {
    const thumb = v.basic.thumbnails.maxres || v.basic.thumbnails.high;
    return `
        <div class="overview-grid">
            <div class="video-preview">
                <img src="${thumb?.url}" style="max-width: 100%; border-radius: 8px;">
                <button onclick="window.open('https://youtube.com/watch?v=${v.basic.videoId}', '_blank')" class="btn-watch"><i class="fab fa-youtube"></i> Xem trên YouTube</button>
            </div>
            <div class="basic-info">
                <h2>${v.basic.title}</h2>
                <div class="info-grid">
                    <div class="info-card"><i class="fas fa-user-circle"></i><h4>Kênh</h4><p>${v.basic.channelTitle}</p></div>
                    <div class="info-card"><i class="fas fa-calendar-alt"></i><h4>Đăng lúc</h4><p>${v.basic.publishedAtFormatted}</p></div>
                    <div class="info-card"><i class="fas fa-clock"></i><h4>Thời lượng</h4><p>${v.contentDetails.durationFormatted}</p></div>
                    <div class="info-card"><i class="fas fa-hashtag"></i><h4>Danh mục</h4><p>${v.categorization.categoryName}</p></div>
                </div>
                <div class="quick-stats">
                    <div class="stat"><i class="fas fa-eye"></i><span>${v.statistics.viewCount}</span><small>Lượt xem</small></div>
                    <div class="stat"><i class="fas fa-thumbs-up"></i><span>${v.statistics.likeCount}</span><small>Lượt thích</small></div>
                    <div class="stat"><i class="fas fa-comment"></i><span>${v.statistics.commentCount}</span><small>Bình luận</small></div>
                </div>
            </div>
        </div>
        <div class="description-box"><h3>Mô tả</h3><p>${v.basic.description.replace(/\n/g, '<br>')}</p></div>
    `;
}

function createDetailsTab(v) {
    return `
        <div class="details-grid">
            <div class="detail-section"><h3>Kỹ thuật</h3><table class="details-table">
                <tr><td>Định dạng:</td><td>${v.contentDetails.definition}</td></tr>
                <tr><td>Phụ đề:</td><td>${v.contentDetails.caption}</td></tr>
                <tr><td>Bản quyền:</td><td>${v.contentDetails.licensedContent}</td></tr>
            </table></div>
            <div class="detail-section"><h3>Quyền</h3><table class="details-table">
                <tr><td>Trạng thái:</td><td>${v.status.privacyStatus}</td></tr>
                <tr><td>Giấy phép:</td><td>${v.status.license}</td></tr>
                <tr><td>Cho trẻ em:</td><td>${v.status.madeForKids}</td></tr>
            </table></div>
            <div class="detail-section full-width"><h3>Thumbnails</h3><div class="thumbnails-grid">
                ${Object.entries(v.basic.thumbnails).map(([k, t]) => `<div class="thumbnail-item"><img src="${t.url}" style="width:100%"><p>${k} (${t.width}x${t.height})</p></div>`).join('')}
            </div></div>
        </div>
    `;
}

function createStatisticsTab(v) {
    return `
        <div class="stats-container">
            <div class="stats-grid">
                <div class="stat-card"><h4>Xem</h4><div class="stat-number">${v.statistics.viewCount}</div></div>
                <div class="stat-card"><h4>Thích</h4><div class="stat-number">${v.statistics.likeCount}</div><p>${v.analysis.engagement.likeRate}</p></div>
                <div class="stat-card"><h4>Bình luận</h4><div class="stat-number">${v.statistics.commentCount}</div><p>${v.analysis.engagement.commentRate}</p></div>
            </div>
            <div class="chart-box"><h4>Điểm số phổ biến</h4><div class="score-circle"><div>${v.analysis.engagement.popularityScore}</div></div></div>
        </div>
    `;
}

function createAnalysisTab(v) {
    return `
        <div class="analysis-container">
            <div class="analysis-card"><h3>SEO</h3><table class="analysis-table">
                <tr><td>Tiêu đề:</td><td>${v.analysis.seo.titleLength} ký tự</td></tr>
                <tr><td>Mô tả:</td><td>${v.analysis.seo.descriptionWordCount} từ</td></tr>
                <tr><td>Tags:</td><td>${v.categorization.tagCount} tags</td></tr>
            </table></div>
            <div class="recommendations">
                ${getRecommendations(v).map(r => `<div class="recommendation ${r.priority}"><h4>${r.title}</h4><p>${r.description}</p></div>`).join('')}
            </div>
        </div>
    `;
}

function createRawDataTab() {
    return `<div class="rawdata-content"><pre><code>${JSON.stringify(fullVideoData, null, 2)}</code></pre></div>`;
}

// ============================================
// 7. XỬ LÝ SỰ KIỆN & CHÍNH (UPDATE)
// ============================================

function initTabs() {
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(btn => btn.onclick = () => {
        btns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
    });
}

async function getFullVideoInfo() {
    const youtubeUrl = youtubeUrlInput.value.trim();
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) return alert('URL không hợp lệ!');

    loadingDiv.style.display = 'block';
    resultDiv.style.display = 'none';

    try {
        const videoData = await fetchAllVideoInfo(videoId);
        fullVideoData = videoData;
        const categoryName = await fetchVideoCategory(videoData.snippet.categoryId);
        const analyzedData = analyzeVideoData(videoData, categoryName, null);

        loadingDiv.style.display = 'none';
        resultDiv.innerHTML = createTabInterface(analyzedData);
        resultDiv.style.display = 'block';
        initTabs();
    } catch (error) {
        loadingDiv.style.display = 'none';
        if (error.message.startsWith("EXPIRED:")) showPaymentUI(error.message.replace("EXPIRED:",""));
        else alert(error.message);
    }
}

function showPaymentUI(msg) {
    resultDiv.innerHTML = `
        <div class="error" style="text-align:center; padding:40px; background:#fff9e6; border-radius:15px; border:2px solid #ffc107">
            <h2 style="color:#856404"><i class="fas fa-crown"></i> TÀI KHOẢN HẾT HẠN</h2>
            <p>${msg}</p>
            <div style="display:flex; gap:20px; justify-content:center; margin-top:20px">
                <div style="background:white; padding:20px; border:2px solid red; border-radius:10px;"><b>GÓI THÁNG</b><br>35.000đ</div>
                <div style="background:white; padding:20px; border:2px solid red; border-radius:10px;"><b>GÓI NĂM</b><br>350.000đ</div>
            </div>
            <p style="margin-top:20px">Chuyển khoản nội dung: <b>Gia han ${currentUser.username}</b></p>
            <p>MB Bank: <b>123456789</b></p>
        </div>
    `;
    resultDiv.style.display = 'block';
}

getInfoBtn.addEventListener('click', getFullVideoInfo);
youtubeUrlInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') getFullVideoInfo(); });
