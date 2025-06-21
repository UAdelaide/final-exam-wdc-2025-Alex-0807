var posts = [];
var search = null;

/*
 * Hides the main part of the page to show the Ask a Question section
 */
function showAsk(){
    var main = document.getElementById("main");
    var ask = document.getElementById("ask");
    main.style.display = "none";
    ask.style.display = "block";
}

/*
 * Hides the Ask a Question section of the page to show the main part,
 * clearing the question input fields.
 */
function showMain(){
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
function createPost(){

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
    xmlhttp.onreadystatechange = function() {
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
function searchPosts(){

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
    for(let i=0; i<posts.length; i++){

        let post = posts[i];

        // Check if a search term used.
        if(search !== null){
            // If so, skip this question/post if title or content doesn't match
            if (post.title.toUpperCase().indexOf(search) < 0 &&
                post.content.toUpperCase().indexOf(search) < 0 ) {
                continue;
            }
        }

        // Generate a set of spans for each of the tags
        let tagSpans = '';
        for(let tag of post.tags){
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
    xmlhttp.onreadystatechange = function() {
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
    posts[index].upvotes ++;
    updatePosts();
}

/*
 * Decrease the votes for a given post, then update the page
 */
function downvote(index) {
    posts[index].upvotes --;
    updatePosts();
}


function login(){

    let user = {
        user: document.getElementById('username').value,
        pass: document.getElementById('password').value
    };

    // Create AJAX Request
    var xmlhttp = new XMLHttpRequest();

    // Define function to run on response
    xmlhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            alert("Welcome "+this.responseText);
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

function logout(){

    // Create AJAX Request
    var xmlhttp = new XMLHttpRequest();

    // Open connection to server & send the post data using a POST request
    xmlhttp.open("POST", "/users/logout", true);
    xmlhttp.send();

}

// 新增：登录表单提交事件
// 页面加载后绑定登录表单事件

document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      // 发送登录请求
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok) {
        // 根据角色跳转
        if (data.role === 'owner') {
          window.location.href = 'owner-dashboard.html';
        } else if (data.role === 'walker') {
          window.location.href = 'walker-dashboard.html';
        }
      } else {
        alert(data.error || '登录失败');
      }
    });
  }
});

// 新增：注销按钮事件
// 绑定 owner/walker dashboard 的注销按钮

document.addEventListener('DOMContentLoaded', function() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function() {
      // 调用后端注销接口
      await fetch('/api/users/logout', { method: 'POST' });
      document.cookie.split(';').forEach(function(c) {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
      // 跳转回登录页
      window.location.href = 'index.html';
    });
  }
});

/**
 * 异步获取当前登录用户信息
 */
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
 * @param {number} walkId
 */
async function applyToWalk(walkId) {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  const walkerId = user.user_id;
  const res = await fetch(`/api/walks/${walkId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walker_id: walkerId })
  });
  if (res.ok) {
    await loadWalks(); // 刷新walk列表，让已申请的walk消失
    showMessage && showMessage('Application submitted');
  } else {
    const data = await res.json();
    alert(data.error || 'Apply failed');
  }
}

// 获取当前用户的所有狗并填充下拉框
async function loadMyDogs() {
  const res = await fetch('/api/users/my-dogs');
  if (res.ok) {
    const dogs = await res.json();
    const select = document.getElementById('dogSelect');
    select.innerHTML = '<option value="">--choose a dog --</option>';
    dogs.forEach(dog => {
      const opt = document.createElement('option');
      opt.value = dog.dog_id;
      opt.textContent = dog.name;
      select.appendChild(opt);
    });
  } else {
    alert('please login or you have not registered any dog');
  }
}

// 页面加载时填充狗狗下拉框，并绑定表单提交事件

document.addEventListener('DOMContentLoaded', function() {
  // fill the dog select dropdown
  if (document.getElementById('dogSelect')) {
    loadMyDogs();
  }

  // submit
  const walkForm = document.getElementById('walkRequestForm');
  if (walkForm) {
    walkForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const dogId = document.getElementById('dogSelect').value;
      if (!dogId) {
        alert('please choose a dog');
        return;
      }

      await applyToWalk(Number(dogId));
    });
  }
});

// load walks when the page loads
async function loadWalks() {
  try {
    const res = await fetch('/api/walks');
    const allWalks = await res.json();
    // only walk not applied
    if (typeof walks !== 'undefined') {
      walks.value = allWalks.filter(walk => walk.status === 'open');
    }
  } catch (err) {
    if (typeof error !== 'undefined') error.value = 'Failed to load walk requests';
  }
}
