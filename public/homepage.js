async function fetchIsLiked(postId, buttonElement) {
  try {
    const response = await fetch(`/isLiked?id=${postId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`, // Add authorization header if needed
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch like status");
    }

    const result = await response.json();
    updateLikeButton(result.isLiked, buttonElement);
  } catch (error) {
    console.error("Error fetching like status:", error);
  }
}

function updateLikeButton(isLiked, buttonElement) {
  if (isLiked) {
    buttonElement.classList.remove("btn-outline-danger");
    buttonElement.classList.add("btn-danger");
  } else {
    buttonElement.classList.remove("btn-danger");
    buttonElement.classList.add("btn-outline-danger");
  }
}
const postContainer = document.getElementById("post-container");
function renderPosts(posts) {
  posts.forEach((post) => {
    if (post) {
      const postElement = document.createElement("div");
      postElement.innerHTML = `
    <div class="card bg-dark text-white p-3 post rounded-0 border-light">
      <a href="/@${post.user.username}/${post.id.includes("txtr") ? post._id : post.id}">
        <div>
        ${
          post.repost
            ? `<p class="text-secondary mb-1 ms-1">
          <i class="fa-solid fa-recycle"></i> ${post.user.name} reposted
        </p> `
            : ""
        }
        <article class="d-flex pt-2 justify-content-between">
                  <article class="d-flex">

        <img class="pfp rounded-circle" src="${post.repost ? post.repost.pp : post.user.pp}" />
        ${
          post.repost
            ? `
             <div class="ms-2">
              <h5 class="font-weight-bold">${post.repost.name.replace(/<[^>]+>/g, "")}</h5>
            `
            : `
            <div class="ms-2">
              <h5 class="font-weight-bold">
                ${post.user.name.replace(/<[^>]+>/g, "")} ${post.reQuote ? `Requoted ${post.reQuote.user.name.replace(/<[^>]+>/g, "")}` : ""}
              </h5>
              `
        }
              <h5 class="text-secondary">${post.time}</h5>
            </div>
          </article>
        <button class="btn btn-outline-light border-none rounded-pill ms-2" style=" border: 0px !important" onclick="report('${post._id}', this)">
        <i class="fa-solid fa-flag"></i>
        </button>
        </article>
      </div>
        <h3 class="h5 mt-2">
          ${post.title.replace(/#(\w+)/g, '<a href="/?search=$1" class="text-info">$&</a>')}
        </h3>
        ${
          post.img
            ? post.img.includes(".mp4") || post.img.includes(".ogg")
              ? `
            <video height="450" class="mb-3 border-light" loop style="border-radius: 2% !important; width: 100%;" controls>
              <source src="${post.img}" type="video/mp4">
            </video>`
              : `<img
                style="border-radius: 2% !important"
                class="mb-3"
                src="${post.img}"
                onerror="this.remove()"
              />`
            : ""
        }
      </a>
      ${
        post.reQuote
          ? `
        <div class="card bg-dark text-white p-2 mb-2 mt-2 border-1 border-secondary">
          <a href="/?id=${post.reQuote.id}">
            <article class="d-flex pt-2">
              <img class="pfp rounded-circle" src="${post.reQuote.user.pp}" />
              <div class="ms-2">
                <h4 class="mb-0">${post.reQuote.user.name.replace(/<[^>]+>/g, "")}</h4>
                <h5 class="text-secondary">${post.reQuote.time}</h5>
              </div>
            </article>
            <h3 class="h4 mt-2">${post.reQuote.title.replace(/<[^>]+>/g, "")}</h3>
            ${
              post.reQuote.img
                ? post.reQuote.img.includes(".mp4") || post.reQuote.img.includes(".ogg")
                  ? `
            <video height="450" class="border-light" loop style="border-radius: 2% !important; width: 100%;" controls>
              <source src="${post.reQuote.img}" type="video/mp4">
            </video>`
                  : `<img
                style="border-radius: 2% !important"
                class="mb-3"
                src="${post.reQuote.img}"
                onerror="this.remove()"
              />`
                : ""
            }
          </a>
        </div>
      `
          : ""
      }
      <div class="d-flex">
        <button class="btn btn-outline-danger rounded-pill" id="like-btn-${post.id}" onclick="sendLikeRequest('${post.id}', this)">
        <i class="fa-solid fa-heart"></i> ${post.like.users.length}
        </button>
        <a href="/?id=${post.id}" class="btn btn-outline-secondary rounded-pill text-black ms-2">
            <i class="fa-solid fa-comment"></i>
        </a>
        <button class="btn btn-outline-success rounded-pill ms-2" onclick='sendPostRequest(undefined, undefined, undefined, "${post.id}", "${post.user._id}"
        , "${post.title}")'><i class="fa-solid fa-recycle"></i></button>
        <button class="btn btn-outline-info rounded-pill ms-2" onclick='share("/?id=${post.id}")'><i class="fa-solid fa-share"></i></button>
        <button
          class="btn btn-outline-secondary rounded-pill ms-2"
          onclick="createBookmark('${post._id}')"
        >
          <i class="fa-solid fa-bookmark"></i>
        </button>
      </div>
    </div>
    `;
      postContainer.appendChild(postElement);

      // Fetch and update like status for this post
      fetchIsLiked(post.id, document.getElementById(`like-btn-${post.id}`));
    }
  });
}

async function loadMorePosts() {
  currentPage++;
  const newPosts = await fetchPosts(currentPage);
  renderPosts(newPosts);
}
// Initial load
fetchPosts(currentPage).then(renderPosts); // Add scroll listener for infinite scrolling
window.addEventListener("scroll", () => {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    // Adjust threshold as needed
    loadMorePosts();
    loadMorePosts();
  }
});
window.addEventListener("DOMContentLoaded", () => {
  loadMorePosts();
  loadMorePosts();
});