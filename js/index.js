const subreddit = "all";
const limit = 50;

let currentFilterIndex = 1;
const filters = [
	"best",
	"hot",
	"new",
	"top",
	"rising",
]

let postsList;
let url;
let renderingPosts = false;

function renderPosts() {
	const proxy = "https://cors-anywhere.herokuapp.com/";
	url = `https://www.reddit.com/r/${subreddit}/${filters[currentFilterIndex]}.json?limit=${limit}`;

	if (renderingPosts)
		renderingPosts = false;

	// Remove old posts
	if (postsList.children.length > 1) {
		const oldPosts = Array.from(postsList.children);
		oldPosts.splice(0, 1);

		oldPosts.forEach(child => {
			postsList.removeChild(child);
		});
	}

	fetch(url)
		.then(function(res) {
			return res.json();
		})
		.then(async function(result) {
			const posts = result.data.children;
			renderingPosts = true;

			for (let i = 0; i < posts.length; i++) {
				const post = posts[i].data;

				if (!renderingPosts)
					break;

				//console.log(post);

				let subredditIcon;
				await fetch(`https://www.reddit.com/r/${post.subreddit}/about.json`).then(function(res) {
					return res.json();
				}).then(function(res) {
					subredditIcon = `<img class="post-subreddit-icon" src="${res.data.icon_img ? res.data.icon_img : res.data.community_icon}" loading="lazy">`;
				});

				const subRedditName = post.subreddit_name_prefixed;
				const author = "u/" + post.author;
				const title = post.title;
				const description = `<p class="post-description">${post.selftext}</p>`;

				const upvotes = post.score > 999 ? Math.sign(post.score) * ((Math.abs(post.score) / 1000).toFixed(1)) + "k" : post.score;
				const comments = post.num_comments > 999 ? Math.sign(post.num_comments) * ((Math.abs(post.num_comments) / 1000).toFixed(1)) + "k" : post.num_comments;
				const crossposts = post.num_crossposts > 999 ? Math.sign(post.num_crossposts) * ((Math.abs(post.num_crossposts) / 1000).toFixed(1)) + "k" : post.num_crossposts;

				// Get date
				const postDate = Math.abs((new Date(post.created * 1000).getTime() / 1000).toFixed(0));
				const currentDate = Math.abs((new Date().getTime() / 1000).toFixed(0));

				const timePassed = currentDate - postDate;

				const years = Math.floor(timePassed / 30758400);
				const days = Math.floor(timePassed / 86400);
				const hours = Math.floor(timePassed / 3600) % 24;
				const minutes = Math.floor(timePassed / 60) % 60;
				const seconds = timePassed % 60;

				let date;
				if (years > 0) {
					date = years > 1 ? years + " years" : years + " year";
				} else if (days > 0) {
					date = days > 1 ? days + " days" : days + " day";
				} else if (hours > 0) {
					date = hours > 1 ? hours + " hours" : hours + " hour";
				} else if (minutes > 0) {
					date = minutes > 1 ? minutes + " minutes" : minutes + " minute";
				} else {
					date = seconds > 1 ? seconds + " seconds" : seconds + " second";
				}

				// Get media
				let media;
				if (post.media) {
					if (post.media.reddit_video) {
						media = `<video class="post-media" controls autoplay><source src=\"${post.media.reddit_video.fallback_url.substring(0, post.media.reddit_video.fallback_url.length - 16)}" type="video/mp4"></video>`;
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

				if (post.over_18)
					continue;

				const div = document.createElement("div");
				div.innerHTML = `<div class="post box">
					<p class="post-header">${subredditIcon}${subRedditName} &middot; Posted by ${author} ${date} ago</p>
					<p class="post-title">${title}</p>
					${description}
					${media}
					<p class="post-footer">${upvotes} points &middot; ${comments} comments &middot; ${crossposts} crossposts</p>
				</div>`;

				// Add to list
				postsList.appendChild(div.firstChild);
			}

			renderingPosts = false;
		})
		.catch(function(err) {
			console.log(err);
			renderingPosts = false;
		});
}

$(document).ready(function () {
	postsList = document.querySelector("#posts-list");
	renderPosts();
});

function setFilter(index) {
	if (index != currentFilterIndex) {
		currentFilterIndex = index;
		renderPosts();
	}
}