localStorage.removeItem("name");
localStorage.removeItem("username");
localStorage.removeItem("id");
async function logout() {
  try {
    const response = await fetch("/logout", {
      method: "POST",
      credentials: "include", // Untuk memastikan cookies dikirim
    });

    if (response.ok) {
      // Menghapus token dari sessionStorage
      sessionStorage.removeItem("myToken");

      // Redirect ke halaman login atau halaman lain
      window.location.href = "/login"; // Sesuaikan dengan URL login Anda
    } else {
      console.error("Failed to logout");
    }
  } catch (error) {
    console.error("Error during logout:", error);
  }
}

let username;
let name;
let id;
async function refreshAccessToken() {
  try {
    if (sessionStorage.getItem("myToken")) {
      return sessionStorage.getItem("myToken");
    }
    const response = await fetch("/refresh", {
      method: "POST",
      credentials: "include", // This ensures cookies are sent
    });
    const data = await response.json();
    if (response.ok) {
      sessionStorage.setItem("myToken", data.accessToken);
      return data.accessToken;
    } else {
      console.error("Failed to refresh token");
      logout();
    }
  } catch (error) {
    console.error("Error refreshing access token:", error);
  }
}
let token;
async function getToken() {
  token = await refreshAccessToken();
  if (!token) {
    logout();
  }
}
try {
  document.getElementById("postLink").addEventListener("click", () => {
    // Redirect to post URL without user=true parameter
    window.location.href = window.location.href.replace("&user=true", "");
  });

  document.getElementById("usersLink").addEventListener("click", () => {
    // Redirect to users URL with user=true parameter
    window.location.href = window.location.href + "&user=true";
  });
} catch {}
function updateCurrentTime() {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1; // Bulan dimulai dari 0
  const year = now.getFullYear();
  const formattedDate = `${month}/${day}/${year}`;

  document.querySelectorAll("#currentTime").forEach((element) => {
    element.textContent = formattedDate;
  });
}

// Panggil fungsi untuk menampilkan waktu saat halaman dimuat
updateCurrentTime();
document.querySelectorAll("#searchInput").forEach((inputSearch) => {
  inputSearch.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();

      const query = event.target.value;
      let url = `/?search=${encodeURIComponent(query)}`;

      // Check if the current URL contains user=true
      if (window.location.search.includes("user=true")) {
        // Append user=true to the new URL if it's not already present
        if (!url.includes("user=true")) {
          url += (url.includes("?") ? "&" : "?") + "user=true";
        }
      } else if (window.location.search.includes("user")) {
        // Ensure any existing user parameter is replaced with user=true
        url += (url.includes("?") ? "&" : "?") + "user=true";
      }

      // Redirect to the new URL
      window.location.href = url;
    }
  });
});

let lastScrollTop = 0;
const navbar = document.querySelector(".navbar");
const navbar2 = document.querySelector(".navbar.fixed-bottom");

const followingfollowers = document.querySelector("#followingfollowers");

window.addEventListener("scroll", () => {
  const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

  if (currentScroll > lastScrollTop) {
    // Scrolling down
    navbar.classList.add("hide");
    navbar2.classList.add("hide");
    followingfollowers.classList.add("hide");
  } else {
    // Scrolling up
    navbar.classList.remove("hide");
    navbar2.classList.remove("hide");
    followingfollowers.classList.remove("hide");
  }

  lastScrollTop = currentScroll <= 0 ? 0 : currentScroll; // For Mobile or negative scrolling
});

if (!window.location.href.toString().includes("/login") && !window.location.href.toString().includes("/signup")) {
  getToken()
    .then(() => {
      fetch(`/user/check`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((check) => {
          if (check.check) {
            logout();
          }
          displayFollowerUsers();

          // Ambil parameter query string
          const params = new URLSearchParams(window.location.search);
          const isFollowing = params.has("following");

          // Ambil elemen
          const forYouLink = document.getElementById("forYou");
          const followingLink = document.getElementById("following");

          // Tambahkan atau hapus kelas aktif
          if (isFollowing) {
            forYouLink.classList.remove("active");
            followingLink.classList.add("active");
            document.title = "Following / Texter";
          } else {
            forYouLink.classList.add("active");
            followingLink.classList.remove("active");
          }
          document.querySelectorAll("#myDetails").forEach((link) => {
            link.href = `/@${check.user.username}`;
          });
          const elements = document.querySelectorAll("#mypfp");

          // Perbarui atribut src untuk setiap elemen
          elements.forEach((element) => {
            element.src = check.user.pp;
          });
          const elements2 = document.querySelectorAll("#myname");

          // Perbarui atribut src untuk setiap elemen
          elements2.forEach((element) => {
            element.innerText = check.user.name;
          });
          const currentPath = window.location.pathname;

          // Daftar ikon dan rute yang sesuai
          const icons = {
            "/": "home",
            "/notification": "bell",
            [`/@${check.user.username}`]: "user",
            "/search": "search",
          };

          // Mengambil semua ikon
          const bellIcons = document.querySelectorAll(".bell-icon"); // Perhatikan bahwa querySelectorAll memerlukan selector yang benar
          const userIcon = document.getElementById("user-icon");
          const starIcon = document.getElementById("home-icon");
          const searchIcon = document.getElementById("search-icon");

          // Fungsi untuk menghapus kelas 'text-primary' dari elemen
          function removeTextPrimaryClass(element) {
            if (element && element.classList.contains("text-primary")) {
              element.classList.remove("text-primary");
            }
          }

          // Hapus kelas 'text-primary' dari ikon yang spesifik
          removeTextPrimaryClass(starIcon);
          removeTextPrimaryClass(userIcon);

          // Iterasi setiap bellIcon dan hapus kelas 'text-primary'
          bellIcons.forEach((icon) => {
            removeTextPrimaryClass(icon);
          });

          // Menambahkan kelas 'text-warning' pada ikon yang sesuai dengan path saat ini
          if (currentPath in icons) {
            const activeIcon = document.querySelectorAll(`#${icons[currentPath]}-icon`);
            activeIcon.forEach((active) => {
              active.classList.add("text-primary");
            });
          }

          document.getElementById("myusername").innerText = `@${check.user.username}`;
          document.getElementById("mydesc").innerText = check.user.desc != undefined ? check.user.desc : "";
          document.getElementById("myfollowing").innerHTML = `<strong>${check.user.following.length}</strong> following`;
          document.getElementById("myfollowers").innerHTML = `<strong>${check.user.followers.length}</strong> followers`;
          document.querySelectorAll(".notif-dot").forEach((dot) => {
            if (check.user.notification.read && window.location.pathname !== "/notification") {
              document.title = `(1) ${document.title.replace("(1) ", "")}`;
              dot.style.display = "block";
            } else {
              dot.style.display = "none";
            }
          });
        });
    })
    .catch((error) => {
      console.error("Error getting token:", error);
    });
  async function getTopUsers() {
    try {
      const response = await fetch("/get/top"); // Assuming your top users endpoint
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      return data.users; // Assuming the API response structure is { users: [...] }
    } catch (error) {
      console.error("Error fetching top users:", error);
      return []; // Return empty array on error
    }
  }
  async function getFollowerUsers() {
    try {
      const response = await fetch("/get/followers", {
        method: "GET", // Use the appropriate HTTP method (GET, POST, etc.)
        headers: {
          Authorization: `Bearer ${token}`, // Add the authorization header
          "Content-Type": "application/json", // Specify the content type if necessary
        },
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      return data.users; // Assuming the API response structure is { users: [...] }
    } catch (error) {
      console.error("Error fetching top users:", error);
      return []; // Return empty array on error
    }
  }
  function togglePopup() {
    const popup = document.getElementById("popup");
    if (popup.classList.contains("d-none")) {
      popup.classList.remove("d-none");
      popup.classList.remove("hidden");
    } else {
      popup.classList.add("d-none");
      popup.classList.add("hidden");
    }
  }

  async function displayTopUsers() {
    const topUsers = await getTopUsers();

    document.querySelectorAll("#topList").forEach((topList) => {
      topList.innerHTML = ""; // Clear existing content

      if (topUsers.length === 0) {
        topList.innerHTML = "<div>No top users available!</div>";
      } else {
        topUsers.forEach((user) => {
          const listItem = document.createElement("div");
          listItem.classList.add("d-flex", "align-items-center", "mb-3"); // Use Flexbox for layout

          // User profile picture
          const profilePic = document.createElement("img");
          profilePic.src = user.pp || "https://via.placeholder.com/50"; // Default placeholder image
          profilePic.alt = user.username;
          profilePic.classList.add("pfp", "rounded-circle");
          profilePic.style.width = "50px"; // Set the width of the profile picture
          profilePic.style.height = "50px"; // Set the height of the profile picture
          profilePic.style.marginRight = "10px"; // Margin between profile picture and text
          listItem.appendChild(profilePic);

          // User info
          const userInfo = document.createElement("div");
          userInfo.classList.add("d-flex", "flex-column");

          const dName = document.createElement("a");
          dName.href = `/@${user.username}`; // Link to user profile page
          dName.classList.add("text-white", "text-decoration-none", "h5");
          dName.textContent = user.name;
          userInfo.appendChild(dName);

          const userFollowers = document.createElement("p");
          userFollowers.classList.add("text-secondary", "mb-0");
          userFollowers.textContent = `${user.followersCount} followers`;
          userInfo.appendChild(userFollowers);

          listItem.appendChild(userInfo);
          topList.appendChild(listItem);
        });
      }
    });
  }
  async function displayFollowerUsers() {
    const topUsers = await getFollowerUsers();

    document.querySelectorAll("#follower").forEach((topList) => {
      topList.innerHTML = ""; // Clear existing content

      if (topUsers.length === 0) {
        topList.innerHTML = "<div>No mutuals users available!</div>";
      } else {
        topUsers.forEach((user) => {
          const listItem = document.createElement("div");
          listItem.classList.add("d-flex", "align-items-center", "mb-3"); // Use Flexbox for layout

          // User profile picture
          const profilePic = document.createElement("img");
          profilePic.src = user.pp || "https://via.placeholder.com/50"; // Default placeholder image
          profilePic.alt = user.username;
          profilePic.classList.add("pfp", "rounded-circle");
          profilePic.style.width = "50px"; // Set the width of the profile picture
          profilePic.style.height = "50px"; // Set the height of the profile picture
          listItem.appendChild(profilePic);

          // User info
          const userInfo = document.createElement("div");
          userInfo.classList.add("d-flex", "flex-column", "ms-2");

          const dName = document.createElement("a");
          dName.href = `/@${user.username}`; // Link to user profile page
          dName.classList.add("text-white", "text-decoration-none", "h5", "mb-1");
          dName.textContent = user.name;
          userInfo.appendChild(dName);

          const userFollowers = document.createElement("p");
          userFollowers.classList.add("text-secondary", "mb-0");
          userFollowers.textContent = `@${user.username}`;
          userInfo.appendChild(userFollowers);

          listItem.appendChild(userInfo);
          topList.appendChild(listItem);
        });
      }
    });
  }

  // Call the displayTopUsers function on page load or after successful login
  displayTopUsers();

  document.addEventListener("DOMContentLoaded", function () {
    var stickyElements = document.querySelectorAll(".sticky-element");
    let lastScrollTop = window.scrollY || document.documentElement.scrollTop;
    function handleScroll() {
      const currentScrollTop = window.scrollY || document.documentElement.scrollTop;
      stickyElements.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var viewportHeight = window.innerHeight;

        const dynamicTop = 1200; // Adjust this value if needed
        if (rect.bottom < viewportHeight) {
          el.style.top = `${viewportHeight - dynamicTop}px`; // Set top to be -10px from the viewport height
        }
      });
    }

    // Add event listener for scroll events
    window.addEventListener("scroll", handleScroll);

    // Initial check
    handleScroll();
  });

  async function getTrendingPosts() {
    try {
      const response = await fetch("/get/trends"); // Assuming your trend endpoint
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      return data.posts.posts;
    } catch (error) {
      console.error("Error fetching trending posts:", error);
      return []; // Return empty array on error
    }
  }

  async function displayTrendingPosts() {
    const trendingPosts = await getTrendingPosts();

    document.querySelectorAll("#trendingPostsList").forEach((trendingPostsList) => {
      trendingPostsList.innerHTML = ""; // Clear existing content

      if (trendingPosts.length === 0) {
        trendingPostsList.innerHTML = "<div>No trending posts yet!</div>";
      } else {
        const maxItemsToShow = 6;

        // Ambil hanya 6 item dari array trendingPosts
        const limitedPosts = trendingPosts.slice(0, maxItemsToShow);

        limitedPosts.forEach((post) => {
          const listItem = document.createElement("div");
          listItem.classList.add("mt-2");

          // Link to post details page (replace with your logic)
          const postLink = document.createElement("a");
          const trendingtext = document.createElement("p");
          trendingtext.classList.add("text-secondary", "mt-1", "mb-1");
          trendingtext.textContent = "Hashtag";
          listItem.appendChild(trendingtext);
          postLink.href = `/?search=${post}`;
          postLink.classList.add("text-white", "text-decoration-none", "h5");
          postLink.textContent = "#" + post;
          listItem.appendChild(postLink);

          trendingPostsList.appendChild(listItem);
        });
      }
    });
  }
  // Call the displayTrendingPosts function on page load or after successful login
  displayTrendingPosts();

  function share(copyText) {
    copyText = "https://texter-id.glitch.me" + copyText.replace("$", "");
    // Copy the text inside the text field
    if (navigator.share) {
      navigator.clipboard.writeText(copyText);

      navigator
        .share({
          title: "Texter",
          text: "Post Seru Nih",
          url: copyText,
        })
        .then(() => console.log("Successful share"))
        .catch((error) => console.log("Error sharing", error));
    } else {
      try {
        window.AndroidShareHandler.share(copyText);
      } catch {
        navigator.clipboard.writeText(copyText);
        alert("Sudah Di Salin Ya, silahkan Beri ke Temanmu ya ^_^");
      }
    }
  }
  // Send a fetch request to the server for posting
  function sendPostRequest(form, replyTo, reQuote, ogId, repost, repostTitle, imgId) {
    event.preventDefault(); // Prevent default form submission
    const title = repostTitle ? repostTitle : form.querySelector("#title").value;

    document.getElementById("loading-screen").classList.remove("d-none");
    const formData = new FormData();
    if (!repost) {
      // Iterate over all file input elements with ID 'img'
      form.querySelector("button").remove();
      const imgInput = form.querySelector(`#${imgId}`);

      // Pilih file dari imgInput atau imgFormInput jika ada
      const selectedFile = imgInput && imgInput.files.length > 0 ? imgInput.files[0] : null;

      formData.append("image", selectedFile ? selectedFile : "");
    }

    // Append data to FormData
    let data = {
      title: title,
      like: { total: 0, users: [] },
      replyTo: replyTo ? replyTo : "",
      ogId: ogId,
      repost: repost,
      reQuote: reQuote ? reQuote : undefined,
    };

    formData.append("data", JSON.stringify(data));
    // Handle image upload

    // Send POST request using fetch
    fetch("/post", {
      method: "POST",
      body: formData,
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        // Periksa apakah responsnya sukses
        if (!response.ok) {
          throw new Error("Network response was not ok.");
        }
        // Mengurai data JSON dari respons
        return response.json();
      })
      .then((post) => {
        // Redirect setelah POST request berhasil
        const redirectId = post.id;
        fetch(`/user/check`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((check) => {
            if (check.check === true) {
              logout();
            }
            username = check.user.username;
            window.location.href = `/@${username}/${redirectId}`;
          });
      })
      .catch((error) => {
        console.error("Error sending POST request:", error);
      });
  }
  function previewImage(event) {
    var input = event.target;

    // Ensure that a file is selected
    if (input.files && input.files[0]) {
      var file = input.files[0];
      var reader = new FileReader();
      const previewId = `#${input.getAttribute("data-preview-id")}`;
      // Handle image preview
      if (file.type.startsWith("image/")) {
        reader.onload = function (e) {
          // Iterate over all image previews and update the first one found
          document.querySelectorAll(previewId).forEach((preview) => {
            preview.src = e.target.result;
            preview.classList.remove("d-none");
          });

          // Hide all video previews
          document.querySelectorAll(`video[id='${previewId.replace("#", "")}']`).forEach((video) => {
            video.classList.add("d-none");
          });
        };
        reader.readAsDataURL(file); // Read the uploaded file as a URL
      }

      // Handle video preview
      else if (file.type.startsWith("video/")) {
        document.querySelectorAll(`video[id='${previewId.replace("#", "")}']`).forEach((videoParent) => {
          videoParent.classList.remove("d-none");
          videoParent.querySelector("source").src = URL.createObjectURL(file);
          videoParent.load();
          // Hide other video previews if necessary
        });

        // Hide all image previews
        document.querySelectorAll(`img[id='${previewId.replace("#", "")}']`).forEach((preview) => {
          preview.classList.add("d-none");
        });

        // Clean up the object URL after video is loaded
        document.querySelectorAll(`video[id='${previewId.replace("#", "")}']`).forEach((videoParent) => {
          videoParent.querySelector("source").addEventListener("loadeddata", function () {
            URL.revokeObjectURL(this.src); // Clean up object URL
          });
        });
      }
    }
  }

  document.querySelectorAll('input[type="file"]').forEach((input) => {
    const previewId = input.id.replace("img", "preview");
    input.setAttribute("data-preview-id", previewId);

    // Adding change event listener
    input.addEventListener("change", previewImage);
  });
  function sendEditProfile(myForm, id) {
    event.preventDefault(); // Prevent default form submission
    const formData = new FormData();
    const name = document.getElementById("displayName").value;
    const username = document.getElementById("username").innerText;
    const desc = document.getElementById("desc").value;
    // Append data to FormData
    const data = {
      id: id,
      username: username,
      name: name,
      pp: "",
      desc: desc,
    };

    formData.append("data", JSON.stringify(data));
    formData.append("token", token); // Assuming you have 'token' available
    // Handle image upload
    if (myForm.querySelector("#imgEdit").files[0]) {
      formData.append("image", myForm.querySelector("#imgEdit").files[0]);
    } else {
      formData.append("image", ""); // Empty string if no image selected
    }

    // Send POST request using fetch
    fetch(`/settings/${username}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method: "POST",
      body: formData,
    }).then(() => {
      window.location.href = "/@" + username;
    });
  }
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

  function sendLikeRequest(id, button) {
    fetch(`/like/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: id,
      }),
    })
      .then((res) => res.json()) // Parse the JSON response
      .then((data) => {
        fetchIsLiked(id, button);
        button.innerHTML = '<i class="fa-solid fa-heart"></i> ' + data.likes; // Update the button text with the new like count
      })
      .catch((error) => {
        console.error("Error sending like request:", error);
        // Handle errors, e.g., display an error message to the user
      });
  }
  function createBookmark(id) {
    fetch(`/bookmark/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: id,
      }),
    });
  }
  function report(postId) {
    try {
      fetch(`/post/report?id=${postId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include", // Ensure cookies are included with the request
      });
    } catch (error) {
      console.error("Error reporting post:", error);
      alert("An error occurred while reporting the post.");
    }
  }

  function followPost(target) {
    fetch(`/user/follow/${target}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        myname: username,
      }),
    }).then(() => {
      window.location.reload();
    });
  }
}
function applyTheme(theme) {
  localStorage.setItem("theme", theme);
  if (theme === "auto") {
    // If data-theme is auto, check the color scheme preference
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
    }
    return;
  }
  document.documentElement.setAttribute("data-theme", theme);
}

// Load the theme from localStorage on page load
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme") || "auto"; // Default to 'dark' if no theme is saved
  applyTheme(savedTheme);
  // List of paths where loading screen should be hidden
  const hiddenPaths = ["/login", "/signup", "/notification"];

  // Get the current path
  const currentPath = window.location.pathname;
  // Check if the current path is in the list of hidden paths
  if (hiddenPaths.includes(currentPath) || currentPath.includes("/settings")) {
    document.getElementById("loading-screen-bottom").classList.add("d-none");
  }
});
