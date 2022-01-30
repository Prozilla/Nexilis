/**
 * Uses the Reddit API to fetch data from reddit.com
 * Documentation: https://www.reddit.com/dev/api/
 * 
 * Made by Prozilla
 */

//#region VARIABLES

// Feed settings
let currentSubreddits = [
	"all",
];

let currentFilterIndex;
const filters = [
	"best",
	"hot",
	"new",
	"top",
	"rising",
];

let currentFeed = {
	subreddits: null,
	filterIndex: null,
};

// List elements
const postsList = document.querySelector("#posts-list");
const filterList = document.querySelector("#filter-list");
const subredditList = document.querySelector("#subreddits-list ul");
const searchResultList = document.querySelector("#search-results");
const customFeedsList = document.querySelector("#feeds-list");

// Input elements
const searchInput = document.querySelector("#search-bar input");
const sensitiveContentToggle = document.querySelector("#sensitive-content");

const sideMenu = document.querySelector("#side-menu");
const pageContent = document.querySelector("#page-content");
const header = document.querySelector("header");
const feedName = document.querySelector("#feed-name");
const subredditOptions = document.querySelector("#subreddit-options");
const postViewer = document.querySelector("#post-viewer");



// Meta settings
let feedId = 0;
const maxPosts = 10;
let postCount = 0;
let lastPost;
let loadingNewPosts = false;
let allowSensitiveContent = false;

//#endregion

//#region GET

/**
 * Calculate the time passed since a unix date
 * @param {number} unixDate - Date in unix format
 */
 function getTimePassedSinceDate(unixDate) {
	const date = Math.abs((new Date(unixDate * 1000).getTime() / 1000).toFixed(0));
	const currentDate = Math.abs((new Date().getTime() / 1000).toFixed(0));

	const timePassed = currentDate - date;

	const years = Math.floor(timePassed / 30758400);
	const days = Math.floor(timePassed / 86400);
	const hours = Math.floor(timePassed / 3600) % 24;
	const minutes = Math.floor(timePassed / 60) % 60;
	const seconds = timePassed % 60;

	let time;
	if (years > 0) {
		time = years > 1 ? years + " years" : years + " year";
	} else if (days > 0) {
		time = days > 1 ? days + " days" : days + " day";
	} else if (hours > 0) {
		time = hours > 1 ? hours + " hours" : hours + " hour";
	} else if (minutes > 0) {
		time = minutes > 1 ? minutes + " minutes" : minutes + " minute";
	} else {
		time = seconds > 1 ? seconds + " seconds" : seconds + " second";
	}

	return time;
}

/**
 * Turn post media into html
 * @param {Object} post - The post with the media that needs to be rendered
 * @returns {string} Post media in html format
 */
async function renderPostMedia(post) {
	if (post.crosspost_parent_list)
		post = post.crosspost_parent_list[0];

	let media;
	if (post.media) {
		if (post.media.reddit_video) {
			const source = post.media.reddit_video.fallback_url.substring(0, post.media.reddit_video.fallback_url.length - 16);

			// Fetch audio
			const audioSource = source.replace(new RegExp("DASH_[0-9]+.mp4"), "DASH_audio.mp4");
			const audioResponse = await fetch(audioSource);
			let audio = "";

			if (audioResponse.status == 200)
				audio = `<audio controls>
					<source src=\"${audioSource}" type="audio/mp4">
				</audio>`;

			media = `<video class="post-media" controls>
				<source src=\"${source}" type="video/mp4">
				${audio}
			</video>`;
		} else if (post.media.oembed) {
			media = `<img class="post-media" src="${post.media.oembed.thumbnail_url}" loading="lazy">`;
		}
	} else if (post.preview) {
		if (post.preview.images[0].variants.gif) {
			media = `<img class="post-media" src="${post.preview.images[0].variants.gif.source.url.replace("&amp;", "&")}" loading="lazy">`;
		} else {
			media = `<img class="post-media" src="${post.preview.images[0].source.url.replace("&amp;", "&")}" loading="lazy">`;
		}
	}

	return media ? media : "";
}

/**
 * Renders a recursively comment in html format
 * @param {Object} comment - The comment on top of the thread that needs to be rendered
 * @returns {string} Comment and its replies in html format
 */
 async function renderComment(comment) {
	const replies = comment.data.replies ? Array.from(comment.data.replies.data.children) : null;
	if (comment.kind == "more") {
		// Do somethig
	}

	// Get user icon
	let icon = `https://www.redditstatic.com/avatars/defaults/v2/avatar_default_${Math.floor(Math.random() * 7)}.png`;
	if (comment.data.author != "[deleted]")
		icon = await fetch(`https://www.reddit.com/user/${comment.data.author}/about.json`).then((result) => result.json()).then(result => {
			return result.data.icon_img;
		});
	
	let thread = `<span class="comment" style="margin-left: ${comment.data.depth * 25}px;">
		<p class="comment-header"><img src="${icon}" loading="lazy"> ${comment.data.author} &middot; ${getTimePassedSinceDate(comment.data.created)} ago</p>
		<p class="comment-body">${comment.data.body}</p>
	</span>`;

	// ${"<i class=\"comment-line\"></i>".repeat(comment.data.depth + 1)}

	// Render replies recursively
	if (replies) {
		for (let i = 0; i < replies.length; i++)
			replies[i] = await renderComment(replies[i]);

		thread += replies.join("");
	}

	return thread;
}

/**
 * Returns the icon of a subreddit or the default subreddit icon if there is none
 * @param {string} subreddit - The name of the subreddit
 * @returns {string} Subreddit icon in html format
 */
async function getSubredditIcon(subreddit) {
	let subredditIcon = "<img class=\"subreddit-icon\" src=\"media/logo.png\">";
	if (subreddit != "all") {
		await fetch(`https://www.reddit.com/r/${subreddit}/about.json`).then(function(result) {
			return result.json();
		}).then(function(result) {
			const source = result.data.icon_img ? result.data.icon_img : result.data.community_icon;
			if (source)
				subredditIcon = `<img class="subreddit-icon" src="${source}" loading="lazy">`;
		}).catch(function(error) {
			console.log(error);
		});
	}

	return subredditIcon;
}

/**
 * Compares two arrays
 * @param {Array} array1 - First array
 * @param {Array} array2 - Second array
 * @returns Whether the two arrays are equal
 */
function arraysEqual(array1, array2) {
	if (array1 === array2) 
		return true;
	if (array1 == null || array2 == null) 
		return false;
	if (array1.length !== array2.length) 
		return false;

	for (var i = 0; i < array1.length; ++i)
		if (array1[i] !== array2[i]) 
			return false;

	return true;
}

//#endregion

//#region SET UP

function setUpPage() {
	// Set element properties
	feedName.disabled = true;
	sensitiveContentToggle.checked = localStorage.getItem("allowSensitiveContent") ? localStorage.getItem("allowSensitiveContent") : false;

	// Set up feed
	if (loadCurrentFeed()) {
		setFilter(currentFilterIndex);
	} else {
		setFilter(1);
	}

	updateSubredditList();
	renderPosts();

	// Set up input events
	getSubreddit();
	searchInput.addEventListener("input", function (event) {
		getSubreddit(event.target.value);
	});

	window.addEventListener("keydown", function(event) {
		if (event.code == "Enter" && feedName.classList.contains("active"))
			saveFeed();
	});

	// Set up click events
	document.addEventListener("click", event => {
		const element = event.target;

		if (!header.contains(element) || element.id == "side-menu-toggle")
			getSubreddit();

		if (!sideMenu.contains(element) && element.id != "side-menu-toggle" && sideMenu.classList.contains("active"))
			toggleSideMenu();

		if (!subredditOptions.contains(element) && feedName.classList.contains("active"))
			hideFeedName();

		if (!subredditOptions.contains(element) && !customFeedsList.contains(element) && customFeedsList.classList.contains("active"))
			customFeedsList.classList.remove("active");

		if (!postViewer.firstChild?.contains(element) && postViewer.classList.contains("active")) {
			hidePostViewer();
		} else if (postsList.contains(element) && element.nodeName != "VIDEO" && element.closest(".post")) {
			showPostViewer(element.getAttribute("data-post-id"));
		} 
	});

	// Set up search
	document.querySelector("#search-bar").addEventListener("click", function (event) {
		getSubreddit(searchInput.value);
	});
}

setUpPage();

//#endregion

//#region POSTS

/**
 * Adds a single post to the list of posts
 * @param {string} html - A post in html format
 */
 function addPost(html) {
	const div = document.createElement("div");
	div.innerHTML = html;

	postsList.appendChild(div.firstChild);

	postsList.querySelectorAll("video.post-media").forEach(video => {
		const audio = video.querySelector("audio");
		if (audio) {
			video.onplay = function() {
				audio.currentTime = video.currentTime;
				audio.play();
			}
			video.onpause = function() {
				audio.pause();
			}
		}
	});
}

/**
 * Render posts of the curren feed and update the list of posts
 * TO DO: save rendered posts to avoid duplicate post in post list
 * @param {boolean} forceOverwrite - If set to true, it will remove old posts before loading new ones
 */
function renderPosts(forceOverwrite) {
	// Check if the feed has been changed
	if (!arraysEqual(currentFeed.subreddits, currentSubreddits) || currentFeed.filterIndex != currentFilterIndex || forceOverwrite) {
		currentFeed.subreddits = currentSubreddits.slice();
		currentFeed.filterIndex = currentFilterIndex;

		lastPost = null;

		// Remove old posts
		if (postsList.children.length > 1) {
			const oldPosts = Array.from(postsList.children);
			oldPosts.splice(0, 1);

			oldPosts.forEach(child => {
				postsList.removeChild(child);
			});
		}

		saveCurrentFeed();

		if (!currentSubreddits.length)
			return addPost("<p class=\"empty-feed-warning\">There doesn't seem to be anything here.</p>");

		feedId++;
	}

	const url = `https://www.reddit.com/r/${currentSubreddits.length > 1 ? currentSubreddits.join("+") : currentSubreddits[0]}/${filters[currentFilterIndex]}.json?limit=${maxPosts}${lastPost ? "&after=" + lastPost : ""}`;

	fetch(url).then(function(result) {
			return result.json();
		}).then(async function(result) {
			const posts = result.data.children;

			if (!posts.length)
				addPost("<p>There doesn't seem to be anything here.</p>");

			for (let i = 0; i < posts.length; i++) {
				const post = posts[i].data;

				// Skip duplicate posts
				if (document.querySelector(`[data-post-id="${post.id}"]`) != null)
					continue;

				const subRedditName = post.subreddit_name_prefixed;
				const author = "u/" + post.author;
				const title = post.title;
				const description = post.selftext ? `<p class="post-description">${post.selftext}</p>` : "";
				const id = post.id;

				const upvotes = post.score > 999 ? Math.sign(post.score) * ((Math.abs(post.score) / 1000).toFixed(1)) + "k" : post.score;
				const comments = post.num_comments > 999 ? Math.sign(post.num_comments) * ((Math.abs(post.num_comments) / 1000).toFixed(1)) + "k" : post.num_comments;
				const crossposts = post.num_crossposts > 999 ? Math.sign(post.num_crossposts) * ((Math.abs(post.num_crossposts) / 1000).toFixed(1)) + "k" : post.num_crossposts;

				if (!allowSensitiveContent && post.over_18)
					continue;

				if (postsList.children[i] == null || (postsList.children[i].id != "filter-list" && postsList.children[i].getAttribute("data-feed-id") != feedId))
					break;

				addPost(`<div data-feed-id="${feedId}" data-post-id="${id}" class="post box">
					<p class="post-header">${await getSubredditIcon(post.subreddit)}${subRedditName} &middot; Posted by ${author} ${getTimePassedSinceDate(post.created)} ago</p>
					<p class="post-title">${title}</p>
					${description}
					${await renderPostMedia(post)}
					<span class="post-footer"><p><i class="far fa-heart"></i>${upvotes}</p><p><i class="far fa-comment"></i>${comments}</p><p><i class="fas fa-random"></i>${crossposts}</p></span>
				</div>`);

				postCount++;
				lastPost = "t3_" + post.id;
			}

			loadingNewPosts = false;
		}).catch(function(error) {
			console.log(error);
		});
}

/**
 * Enables the post viewer and renders the selected post
 * @param {number} id - Id of the post that needs to be rendered
 */
 function showPostViewer(id) {
	postViewer.setAttribute("data-post-id", id);

	// Load post (has to be made into a seperate function)
	fetch(`https://www.reddit.com/comments/${id}/.json`).then(function(result) {
		return result.json();
	}).then(async function(result) {
		const post = result[0].data.children[0].data;
		const threads = result[1].data.children;

		const subRedditName = post.subreddit_name_prefixed;
		const author = "u/" + post.author;
		const title = post.title;
		const description = `<p class="post-description">${post.selftext}</p>`;
		const id = post.id;

		const upvotes = post.score > 999 ? Math.sign(post.score) * ((Math.abs(post.score) / 1000).toFixed(1)) + "k" : post.score;
		const comments = post.num_comments > 999 ? Math.sign(post.num_comments) * ((Math.abs(post.num_comments) / 1000).toFixed(1)) + "k" : post.num_comments;
		const crossposts = post.num_crossposts > 999 ? Math.sign(post.num_crossposts) * ((Math.abs(post.num_crossposts) / 1000).toFixed(1)) + "k" : post.num_crossposts;

		postViewer.innerHTML = `<div class="post box">
			<p class="post-header">${await getSubredditIcon(post.subreddit)}${subRedditName} &middot; Posted by ${author} ${getTimePassedSinceDate(post.created)} ago</p>
			<p class="post-title">${title}</p>
			${description}
			${await renderPostMedia(post)}
			<span class="post-footer"><p><i class="far fa-heart"></i>${upvotes}</p><p><i class="far fa-comment"></i>${comments}</p><p><i class="fas fa-random"></i>${crossposts}</p></span>
			<p id="loading-comments">Loading comments...</p>
		</div>`;

		if (threads.length) {
			for (let i = 0; i < threads.length; i++) {
				const comment = await renderComment(threads[i]);

				if (postViewer.getAttribute("data-post-id") != id)
					return;
				
				comment.replace(/\\n\\t\\t\\t/g, "");

				const div = document.createElement("div");
				div.innerHTML = comment;

				if (i == 0)
					postViewer.firstChild.querySelector("#loading-comments").remove();
				postViewer.firstChild.appendChild(div);
			}
		}
	});

	// Show post viewer
	postViewer.classList.add("active");

	postsList.style.filter = "blur(5px)";
	postsList.style.pointerEvents = "none";

	sideMenu.style.filter = "blur(5px)";
	sideMenu.style.pointerEvents = "none";

	document.body.style.overflow = "hidden";
}

/**
 * Disables the post viewer
 */
function hidePostViewer() {
	postViewer.classList.remove("active");

	postsList.style.filter = null;
	postsList.style.pointerEvents = null;

	sideMenu.style.filter = null;
	sideMenu.style.pointerEvents = null;

	document.body.style.overflow = null;
}

//#endregion

//#region FEED

/**
 * Updates list that displayes the subreddits of the current feed
 */
 async function updateSubredditList() {
	let oldSubreddits = [];
	Array.from(subredditList.children).forEach(child => {
		oldSubreddits.push(child.textContent.trim().replace("r/", ""));
	});

	// Add missing subreddits
	for (let i = 0; i < currentSubreddits.length; i++)
		if (!oldSubreddits.includes(currentSubreddits[i]))
			subredditList.innerHTML += `<li>${await getSubredditIcon(currentSubreddits[i])} r/${currentSubreddits[i]} <button class="subreddit-toggle-button button" onclick="toggleSubreddit('${currentSubreddits[i]}')"></button></li>`;

	// Remove subreddits
	for (let i = 0; i < subredditList.children.length; i++)
		if (!currentSubreddits.includes(subredditList.children[i].textContent.trim().replace("r/", ""))) {
			subredditList.removeChild(subredditList.children[i]);
			i--; // Index decreases becaues child is removed
		}

	if (!currentSubreddits.length)
		subredditList.textContent = null;

	updateSubredditButtons();
}

/**
 * Updates the list of posts
 */
function updateFeed() {
	if (!arraysEqual(currentFeed.subreddits, currentSubreddits) || currentFeed.filterIndex != currentFilterIndex)
		renderPosts();
}

/**
 * Saves the current feed to local storage
 */
 function saveCurrentFeed() {
	localStorage.setItem("currentFeed", JSON.stringify(currentFeed));
}

/**
 * Loads the current feed from local storage
 * @returns {boolean} False if there was no saved feed
 */
function loadCurrentFeed() {
	const feed = JSON.parse(localStorage.getItem("currentFeed"));

	if (feed != null) {
		currentFeed = feed;
		currentSubreddits = currentFeed.subreddits.slice();
		currentFilterIndex = currentFeed.filterIndex;

		return true;
	} else {
		return false;
	}
}

/**
 * Updates all toggle subreddit buttons
 */
function updateSubredditButtons() {
	document.querySelectorAll(".subreddit-toggle-button").forEach(button => {
		if (currentSubreddits.includes(button.getAttribute("onclick").replace("toggleSubreddit('", "").replace("')", ""))) {
			button.classList.add("active");
		} else if (button.classList.contains("active")) {
			button.classList.remove("active");
		}
	});
}

/**
 * Enables to custom feed list to let the user load a new feed
 */
function showCustomFeedList() {
	const customFeeds = localStorage.getItem("customFeeds") ? JSON.parse(localStorage.getItem("customFeeds")) : null;

	if (customFeeds) {
		customFeedsList.classList.add("active");

		customFeedsList.children[0].innerHTML = Object.keys(customFeeds).map(key => 
			`<li>${key} (${customFeeds[key].subreddits.length})<button class="feed-load-button button" onclick="loadFeed('${key}')"></li>`
		).join("");
	}
}

/**
 * Changes the current filter and updates the list of posts
 * @param {number} index - Index of the new filter
 */
 function setFilter(index) {
	// Should return if the user presses the current filter button

	for (let i = 0; i < filterList.children.length; i++) {
		if (i == index) {
			filterList.children[i].classList.add("active");
		} else if (filterList.children[i].classList.contains("active")) {
			filterList.children[i].classList.remove("active");
		}
	}

	currentFilterIndex = index;
	updateFeed();
}

/**
 * Add/remove a subreddit from the current feed
 * @param {string} subreddit - Name of the new subreddit
 */
function toggleSubreddit(subreddit) {
	if (currentSubreddits.includes(subreddit)) {
		currentSubreddits.splice(currentSubreddits.indexOf(subreddit), 1); // Remove subreddit from list of current subreddits
	} else {
		currentSubreddits.push(subreddit);
	}

	updateSubredditList();
	updateFeed();
}

/**
 * Saves a custom feed
 */
 function saveFeed() {
	const customFeeds = localStorage.getItem("customFeeds") ? JSON.parse(localStorage.getItem("customFeeds")) : {};
	customFeeds[feedName.value] = currentFeed;

	localStorage.setItem("customFeeds", JSON.stringify(customFeeds));
	hideFeedName();
}

/**
 * Load a custom feed
 * @param {string} name - Name of the custom feed to load
 */
function loadFeed(name) {
	const customFeeds = localStorage.getItem("customFeeds") ? JSON.parse(localStorage.getItem("customFeeds")) : null;

	if (!name || !customFeeds || !customFeeds[name])
		return;

	currentSubreddits = customFeeds[name].subreddits;
	currentFilterIndex = customFeeds[name].filterIndex;

	// Update the list of posts and the list filters
	setFilter(currentFilterIndex);
	updateSubredditList();
}

//#endregion

//#region SCROLLING

document.addEventListener("scroll", function(event) {
	const lastPostTop = document.querySelector("#posts-list > div:last-child").getBoundingClientRect().top;
	const screenBottom = window.innerHeight;

	// Check if the last post is visible
	if (screenBottom > lastPostTop && !loadingNewPosts) {
		renderPosts();
		loadingNewPosts = true;
		console.log("rendering posts");
	}
});

//#endregion

//#region SEARCHING

/**
 * Search for a subreddit name and update search results
 * @param {string} name - Name of the subreddit to search for
 */
 async function getSubreddit(name) {
	const searchUrl = `https://www.reddit.com/subreddits/search.json?q=${name}`;

	if (!name) {
		searchResultList.innerHTML = "";
		searchResultList.style.display = "none";
	} else {
		await fetch(searchUrl).then(function(result) {
			return result.json();
		}).then(function(result) {			
			if (searchInput.value != name)
				return searchResultList.style.display = "none";

			const searchResults = result.data.children.slice(0, 15);

			searchResultList.innerHTML = searchResults.map(element => 
				`<p class="search-result">${element.data.display_name_prefixed}<button class="subreddit-toggle-button button" onclick="toggleSubreddit('${element.data.display_name}')"></button></p>`
			).join("");
		});

		searchResultList.style.display = null;
	}

	updateSubredditButtons();
}

//#endregion

//#region SIDE MENU

/**
 * Used on mobile to toggle a menu overlay
 */
 function toggleSideMenu() {
	if (!sideMenu.classList.contains("active")) {
		sideMenu.classList.add("active");

		postsList.style.filter = "blur(5px)";
		postsList.style.pointerEvents = "none";
		document.body.style.overflow = "hidden";
	} else {
		sideMenu.classList.remove("active");

		postsList.style.filter = null;
		postsList.style.pointerEvents = null;
		document.body.style.overflow = null;
	}
}

/**
 * Enables input field for custom feed name
 */
function showFeedName() {
	feedName.classList.add("active");
	feedName.disabled = false;
	feedName.focus();
	feedName.select();
}

/**
 * Disables input field for custom feed name
 */
function hideFeedName() {
	feedName.classList.remove("active");
	feedName.disabled = true;
}

//#endregion

//#region OPTIONS

function toggleSensitiveContent() {
	localStorage.setItem("allowSensitiveContent", sensitiveContentToggle.checked);
	allowSensitiveContent = sensitiveContentToggle.checked;
	renderPosts(true);
}

//#endregion