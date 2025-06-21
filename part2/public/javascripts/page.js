var posts = [];
var search = null;

/*
 * Hides the main part of the page to show the Ask a Question section
 */
function showAsk() {
    var main = document.getElementById("main");
    var ask = document.getElementById("ask");
    main.style.display = "none";
    ask.style.display = "block";
}

/*
 * Hides the Ask a Question section of the page to show the main part,
 * clearing the question input fields.
 */
function showMain() {
    var main = document.getElementById("main");
    var ask = document.getElementById("ask");
    ask.style.display = "none";
    main.style.display = "block";

    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    document.getElementById('post-tags').value = '';
}

/*
 * Creates a new question/post & send it to the server, before triggering an update for the main part of the page.
 */
function createPost() {

    search = null;

    let post = {
        title: document.getElementById('post-title').value,
        content: document.getElementById('post-content').value,
        tags: document.getElementById('post-tags').value.split(" "),
        upvotes: 0
    };

    // Create AJAX Request
    var xmlhttp = new XMLHttpRequest();

    // Define function to run on response
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            // Update the page on success
            loadPosts();
            showMain();
        }
    };

    // Open connection to server & send the post data using a POST request
    // We will cover POST requests in more detail in week 8
    xmlhttp.open("POST", "/addpost", true);
    xmlhttp.setRequestHeader("Content-type", "application/json");
    xmlhttp.send(JSON.stringify(post));

}

/*
 * Updates the search term then reloads the posts shown
 */
function searchPosts() {

    search = document.getElementById('post-search').value.toUpperCase();
    updatePosts();

}


/*
 * Reloads the posts shown on the page
 * Iterates over the array of post objects, rendering HTML for each and appending it to the page
 * If a search term is being used
 */
function updatePosts() {

    // Reset the page
    document.getElementById('post-list').innerHTML = '';

    // Iterate over each post in the array by index
    for (let i = 0; i < posts.length; i++) {

        let post = posts[i];

        // Check if a search term used.
        if (search !== null) {
            // If so, skip this question/post if title or content doesn't match
            if (post.title.toUpperCase().indexOf(search) < 0 &&
                post.content.toUpperCase().indexOf(search) < 0) {
                continue;
            }
        }

        // Generate a set of spans for each of the tags
        let tagSpans = '';
        for (let tag of post.tags) {
            tagSpans = tagSpans + `<span class="tag">${tag}</span>`;
        }

        // Generate the post/question element and populate its inner HTML
        let postDiv = document.createElement("DIV");
        postDiv.classList.add("post");

        postDiv.innerHTML = `
            <div class="votes">
                <button onclick="upvote(${i})">+</button>
                <p><span class="count">${post.upvotes}</span><br />votes</p>
                <button onclick="downvote(${i})">-</button>
            </div>
            <div class="content">
                <h3><a href="#">${post.title}</a></h3>
                <i>By ${post.author}</i>
                <p>${post.content}</p>
                ${tagSpans}<span class="date">${new Date(post.timestamp).toLocaleString()}</span>
            </div>
        `;

        // Append the question/post to the page
        document.getElementById("post-list").appendChild(postDiv);

    }


}

/*
 * Loads posts from the server
 * - Send an AJAX GET request to the server
 * - JSON Array of posts sent in response
 * - Update the
 */
function loadPosts() {

    // Create AJAX Request
    var xmlhttp = new XMLHttpRequest();

    // Define function to run on response
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            // Parse the JSON and update the posts array
            posts = JSON.parse(this.responseText);
            // Call the updatePosts function to update the page
            updatePosts();
        }
    };

    // Open connection to server
    xmlhttp.open("GET", "/posts", true);

    // Send request
    xmlhttp.send();

}


/*
 * Increase the votes for a given post, then update the page
 */
function upvote(index) {
    posts[index].upvotes++;
    updatePosts();
}

/*
 * Decrease the votes for a given post, then update the page
 */
function downvote(index) {
    posts[index].upvotes--;
    updatePosts();
}


function login() {

    let user = {
        user: document.getElementById('username').value,
        pass: document.getElementById('password').value
    };

    // Create AJAX Request
    var xmlhttp = new XMLHttpRequest();

    // Define function to run on response
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            alert("Welcome " + this.responseText);
        } else if (this.readyState == 4 && this.status >= 400) {
            alert("Login failed");
        }
    };

    // Open connection to server & send the post data using a POST request
    // We will cover POST requests in more detail in week 8
    xmlhttp.open("POST", "/users/login", true);
    xmlhttp.setRequestHeader("Content-type", "application/json");
    xmlhttp.send(JSON.stringify(user));

}

function logout() {

    // Create AJAX Request
    var xmlhttp = new XMLHttpRequest();

    // Open connection to server & send the post data using a POST request
    xmlhttp.open("POST", "/users/logout", true);
    xmlhttp.send();

}

// 新增：登录表单提交事件
// 页面加载后绑定登录表单事件

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            console.log('Login attempt:', username);

            // send login request
            const res = await fetch('/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (res.ok) {
                // jump according to role
                console.log('Login successful:');

                if (data.role === 'owner') {
                    window.location.href = 'owner-dashboard.html';
                } else if (data.role === 'walker') {
                    window.location.href = 'walker-dashboard.html';
                }
            } else {
                alert(data.error || 'fail to login');
            }
        });
    }
});

// 新增：注销按钮事件
// 绑定 owner/walker dashboard 的注销按钮

document.addEventListener('DOMContentLoaded', function () {

    const logoutBtn = document.getElementById('logoutBtn');
    console.log('[logout] script loaded — btn =', logoutBtn);
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function () {
            //calling logout API
            console.log('log out clicked');
            await fetch('/api/users/logout', { method: 'POST' });
            //delete cookies
            document.cookie.split(';').forEach(function (c) {
                document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
            });
            // jump to index.html
            window.location.href = 'index.html';
        });
    }
});

/**
 * 异步获取当前登录用户信息
 * 调用 /api/users/me，返回用户对象（包含 user_id、username、role 等）
 */
//return object with user_id, username, role
async function getCurrentUser() {
    const res = await fetch('/api/users/me');
    if (res.ok) {
        return await res.json();
    } else {
        return null;
    }
}

/**
 * 申请遛狗任务
 * @param {number} walkId - 要申请的遛狗任务ID
 */
async function applyToWalk(walkId) {
    // get current user
    console.log('applyToWalk called with walkId:', walkId);
    const user = await getCurrentUser();
    if (!user) {
        alert('请先登录');
        window.location.href = 'index.html';
        return;
    }
    const walkerId = user.user_id; // 动态获取当前用户ID

    // 发送申请请求到后端
    const res = await fetch('/api/walks/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walkId, walkerId })
    });

    if (res.ok) {
        alert('申请成功！');
        // 可根据需要刷新页面或更新任务列表
    } else {
        const data = await res.json();
        alert(data.error || '申请失败');
    }
}
