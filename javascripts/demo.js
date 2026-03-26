(function () {
    function byId(id) {
        return document.getElementById(id);
    }

    function bySelector(selector, root) {
        return (root || document).querySelector(selector);
    }

    function bySelectorAll(selector, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    }

    function text(node, value) {
        if (node) {
            node.textContent = value;
        }
    }

    function safeString(value, fallback, maxLength) {
        if (typeof value !== "string") {
            return fallback;
        }

        var trimmed = value.slice(0, maxLength || 240);
        return trimmed || fallback;
    }

    function safeInteger(value, fallback, min, max) {
        if (!Number.isInteger(value)) {
            return fallback;
        }

        if (typeof min === "number" && value < min) {
            return fallback;
        }

        if (typeof max === "number" && value > max) {
            return fallback;
        }

        return value;
    }

    function safeStringList(list, maxItems, maxLength) {
        if (!Array.isArray(list)) {
            return [];
        }

        return list
            .slice(0, maxItems || 16)
            .filter(function (item) {
                return typeof item === "string";
            })
            .map(function (item) {
                return item.slice(0, maxLength || 240);
            });
    }

    function safeHistoryList(list) {
        if (!Array.isArray(list)) {
            return [];
        }

        return list
            .slice(0, 8)
            .filter(function (entry) {
                return entry && typeof entry === "object";
            })
            .map(function (entry) {
                return {
                    index: safeInteger(entry.index, 1, 1, 100000),
                    command: safeString(entry.command, "", 120),
                    detail: safeString(entry.detail, "", 220),
                };
            });
    }

    function SiteLayout() {
        this.main = bySelector('.col-md-9[role="main"]');
        this.sidebar = bySelector(".col-md-3");
        this.tocList = bySelector("#toc-collapse ul");
        this.home = bySelector(".mr-home");
        this.blog = bySelector(".mr-blog-shell, .mr-blog-index");
        this.demo = byId("mr-demo");
        this.pathname = window.location.pathname;
        this.init();
    }

    SiteLayout.prototype.init = function () {
        var body = document.body;
        if (!body || !this.main) {
            return;
        }

        if (this.home) {
            body.classList.add("mr-layout-home");
        } else if (this.blog) {
            body.classList.add("mr-layout-blog");
        } else if (this.demo) {
            body.classList.add("mr-layout-demo");
        } else {
            body.classList.add("mr-layout-docs");
        }

        this.applyDocsVariant(body);
        this.cleanupDuplicateDocTitle();
        this.applyTocVisibility(body);
    };

    SiteLayout.prototype.cleanupDuplicateDocTitle = function () {
        if (!document.body.classList.contains("mr-layout-docs")) {
            return;
        }

        var shellTitle = bySelector(".mr-doc-shell .mr-doc-title");
        var primaryHeading = bySelector('.col-md-9[role="main"] > h1');
        var tocAnchors = this.tocList ? bySelectorAll("a", this.tocList) : [];
        var expectedTitle = shellTitle ? (shellTitle.textContent || "").trim() : "";
        var headingText = primaryHeading ? (primaryHeading.textContent || "").trim() : "";
        var normalizedHeading = headingText.replace(/^title:\s*/i, "").trim();

        if (primaryHeading && expectedTitle && normalizedHeading === expectedTitle) {
            primaryHeading.parentNode.removeChild(primaryHeading);
        }

        if (!tocAnchors.length || !expectedTitle) {
            return;
        }

        var firstTocLink = tocAnchors[0];
        var firstTocText = ((firstTocLink && firstTocLink.textContent) || "").trim();
        if (firstTocText.replace(/^title:\s*/i, "").trim() !== expectedTitle) {
            return;
        }

        var firstTocItem = firstTocLink.closest("li");
        if (firstTocItem) {
            firstTocItem.parentNode.removeChild(firstTocItem);
        }
    };

    SiteLayout.prototype.applyDocsVariant = function (body) {
        if (!body.classList.contains("mr-layout-docs")) {
            return;
        }

        var explicitLayoutMeta = bySelector('meta[name="mr-doc-layout"]');
        var explicitLayoutRoot = bySelector("[data-mr-doc-layout]", this.main) || bySelector(".mr-doc-shell[data-mr-doc-layout]");
        var explicitLayout = explicitLayoutMeta
            ? explicitLayoutMeta.getAttribute("content")
            : explicitLayoutRoot
              ? explicitLayoutRoot.getAttribute("data-mr-doc-layout")
              : "";
        var topLevelBlocks = bySelectorAll(":scope > p, :scope > ul, :scope > ol, :scope > blockquote, :scope > pre, :scope > .highlight", this.main);
        var headings = bySelectorAll("h2, h3", this.main);
        var cardCount = bySelectorAll(".mr-doc-card", this.main).length;
        var gridCount = bySelectorAll(".mr-doc-grid, .mr-doc-band", this.main).length;
        var articleSignals = bySelectorAll(".mr-snippet-note, .mr-section-break, .gist", this.main).length;
        var proseLength = topLevelBlocks.reduce(function (total, node) {
            return total + ((node.textContent || "").trim().length || 0);
        }, 0);
        var likelyArticle =
            proseLength >= 3200 && (topLevelBlocks.length >= 8 || headings.length >= 7 || articleSignals >= 2);
        var likelyReference =
            !!bySelector(".mr-doc-shell", this.main) &&
            !likelyArticle &&
            (cardCount >= 4 || gridCount >= 2 || (cardCount >= 2 && proseLength < 3200));
        var layout = explicitLayout === "reference" || explicitLayout === "article" ? explicitLayout : likelyReference ? "reference" : "article";

        body.classList.add(layout === "reference" ? "mr-doc-layout-reference" : "mr-doc-layout-article");
    };

    SiteLayout.prototype.applyTocVisibility = function (body) {
        if (!body.classList.contains("mr-layout-docs")) {
            body.classList.add("mr-toc-hidden");
            return;
        }

        var tocItems = this.tocList ? bySelectorAll("li", this.tocList) : [];
        var headings = bySelectorAll("h2, h3", this.main);
        var proseBlocks = bySelectorAll("p, li, pre, blockquote", this.main);
        var contentLength = proseBlocks.reduce(function (total, node) {
            return total + (node.textContent || "").trim().length;
        }, 0);
        var articleLayout = body.classList.contains("mr-doc-layout-article");
        var shouldShow = articleLayout
            ? tocItems.length >= 6 && headings.length >= 7 && contentLength >= 3600
            : tocItems.length >= 4 && headings.length >= 5 && contentLength >= 2200;

        body.classList.toggle("mr-toc-visible", shouldShow);
        body.classList.toggle("mr-toc-hidden", !shouldShow);
    };

    function NavEnhancements() {
        this.body = document.body;
        this.pathname = window.location.pathname.replace(/index\.html$/, "");
        this.navbar = bySelector(".navbar");
        this.init();
    }

    NavEnhancements.prototype.init = function () {
        this.markActiveItems();
        this.decorateHeader();
        this.improveMobileMenu();
    };

    NavEnhancements.prototype.markActiveItems = function () {
        var links = bySelectorAll(".navbar-nav a");
        var matched = null;

        links.forEach(
            function (link) {
                var href = link.getAttribute("href") || "";
                if (!href || href.indexOf("http") === 0 || href === "#") {
                    return;
                }

                var normalized = href.replace(/index\.html$/, "");
                var isCurrent =
                    normalized === this.pathname ||
                    (normalized !== "/" && this.pathname.indexOf(normalized) === 0 && normalized.length > 1);

                if (isCurrent) {
                    matched = link;
                    link.classList.add("is-current");
                    var parentLi = link.closest("li");
                    if (parentLi) {
                        parentLi.classList.add("active");
                    }
                    var dropdown = link.closest(".dropdown");
                    if (dropdown) {
                        dropdown.classList.add("active");
                    }
                }
            }.bind(this)
        );

        if (!matched) {
            var brand = bySelector(".navbar-brand");
            if (brand && this.pathname === "/") {
                brand.classList.add("is-current");
            }
        }
    };

    NavEnhancements.prototype.decorateHeader = function () {
        if (!this.navbar) {
            return;
        }
        this.body.classList.add("mr-has-sticky-header");
        this.syncScrollState();
        window.addEventListener("scroll", this.syncScrollState.bind(this), { passive: true });
    };

    NavEnhancements.prototype.syncScrollState = function () {
        this.body.classList.toggle("mr-header-scrolled", window.scrollY > 8);
    };

    NavEnhancements.prototype.improveMobileMenu = function () {
        var toggle = bySelector(".navbar-toggler, .navbar-toggle");
        var targetSelector = toggle ? toggle.getAttribute("data-bs-target") : null;
        var targetId = toggle ? toggle.getAttribute("aria-controls") : null;
        var collapse = targetSelector ? bySelector(targetSelector) : null;
        if (!collapse && targetId) {
            collapse = byId(targetId);
        }
        if (!collapse) {
            collapse = bySelector(".navbar-collapse");
        }
        if (!toggle || !collapse) {
            return;
        }

        var syncState = function () {
            var expanded = toggle.getAttribute("aria-expanded") === "true";
            var isOpen = collapse.classList.contains("show")
                || collapse.classList.contains("in")
                || expanded
                || !toggle.classList.contains("collapsed");
            document.body.classList.toggle("mr-mobile-nav-open", isOpen && window.innerWidth <= 991);
        };

        toggle.addEventListener("click", function () {
            window.setTimeout(syncState, 30);
        });

        collapse.addEventListener("shown.bs.collapse", syncState);
        collapse.addEventListener("hidden.bs.collapse", syncState);
        window.addEventListener("resize", syncState, { passive: true });

        if (window.MutationObserver) {
            new MutationObserver(syncState).observe(collapse, {
                attributes: true,
                attributeFilter: ["class"],
            });
            new MutationObserver(syncState).observe(toggle, {
                attributes: true,
                attributeFilter: ["aria-expanded", "class"],
            });
        }

        bySelectorAll(".navbar-collapse a").forEach(function (link) {
            link.addEventListener("click", function () {
                document.body.classList.remove("mr-mobile-nav-open");
            });
        });

        syncState();
    };

    function ReadingEnhancements() {
        this.body = document.body;
        this.main = bySelector('.col-md-9[role="main"]');
        this.heroMeta = bySelector(".mr-blog-meta");
        this.isBlogArticle = this.body.classList.contains("mr-layout-blog") && !!this.heroMeta;
        this.progress = null;
        this.init();
    }

    ReadingEnhancements.prototype.init = function () {
        if (!this.main || !this.isBlogArticle) {
            return;
        }

        this.addReadingTime();
        this.addArticleOutline();
        this.decorateHeadings();
        this.decorateImages();
        this.enableScrollProgress();
    };

    ReadingEnhancements.prototype.addReadingTime = function () {
        var words = (this.main.textContent || "").trim().split(/\s+/).filter(Boolean).length;
        var minutes = Math.max(1, Math.round(words / 220));
        var badge = document.createElement("span");
        badge.className = "mr-reading-time";
        badge.textContent = minutes + " min read";
        this.heroMeta.appendChild(document.createTextNode(" "));
        this.heroMeta.appendChild(badge);
    };

    ReadingEnhancements.prototype.addArticleOutline = function () {
        var headings = bySelectorAll('.col-md-9[role="main"] > h2');
        if (headings.length < 2) {
            return;
        }

        var shell = bySelector(".mr-blog-shell");
        if (!shell) {
            return;
        }

        var card = document.createElement("section");
        card.className = "mr-blog-outline";
        var kicker = document.createElement("p");
        kicker.className = "mr-blog-outline-kicker";
        kicker.textContent = "In this article";
        var list = document.createElement("div");
        list.className = "mr-blog-outline-list";
        card.appendChild(kicker);
        card.appendChild(list);

        headings.forEach(function (heading) {
            if (!heading.id) {
                heading.id = (heading.textContent || "")
                    .toLowerCase()
                    .trim()
                    .replace(/[^\w\s-]/g, "")
                    .replace(/\s+/g, "-");
            }
            var link = document.createElement("a");
            link.className = "mr-blog-outline-link";
            link.href = "#" + heading.id;
            link.textContent = heading.textContent || "";
            list.appendChild(link);
        });

        shell.appendChild(card);
    };

    ReadingEnhancements.prototype.decorateHeadings = function () {
        bySelectorAll('.col-md-9[role="main"] > h2, .col-md-9[role="main"] > h3').forEach(function (heading) {
            if (!heading.id) {
                heading.id = (heading.textContent || "")
                    .toLowerCase()
                    .trim()
                    .replace(/[^\w\s-]/g, "")
                    .replace(/\s+/g, "-");
            }

            if (bySelector(".mr-heading-anchor", heading)) {
                return;
            }

            var anchor = document.createElement("a");
            anchor.className = "mr-heading-anchor";
            anchor.href = "#" + heading.id;
            anchor.setAttribute("aria-label", "Copy section link");
            anchor.textContent = "#";
            heading.appendChild(anchor);
        });
    };

    ReadingEnhancements.prototype.decorateImages = function () {
        bySelectorAll('.col-md-9[role="main"] > img').forEach(function (image) {
            if (image.closest("figure")) {
                return;
            }

            var captionText = image.getAttribute("alt");
            var figure = document.createElement("figure");
            figure.className = "mr-figure";
            image.parentNode.insertBefore(figure, image);
            figure.appendChild(image);

            if (captionText) {
                var caption = document.createElement("figcaption");
                caption.textContent = captionText;
                figure.appendChild(caption);
            }
        });
    };

    ReadingEnhancements.prototype.enableScrollProgress = function () {
        this.progress = document.createElement("div");
        this.progress.className = "mr-reading-progress";
        var bar = document.createElement("span");
        bar.className = "mr-reading-progress-bar";
        this.progress.appendChild(bar);
        document.body.appendChild(this.progress);
        this.updateProgress();
        window.addEventListener("scroll", this.updateProgress.bind(this), { passive: true });
        window.addEventListener("resize", this.updateProgress.bind(this));
    };

    ReadingEnhancements.prototype.updateProgress = function () {
        if (!this.progress) {
            return;
        }

        var bar = this.progress.firstElementChild;
        var start = this.main.offsetTop;
        var end = start + this.main.offsetHeight - window.innerHeight;
        var ratio = end <= start ? 1 : (window.scrollY - start) / (end - start);
        var clamped = Math.max(0, Math.min(1, ratio));
        bar.style.transform = "scaleX(" + clamped + ")";
    };

    function Demo() {
        this.root = byId("mr-demo");
        if (!this.root) {
            return;
        }

        this.nodes = [
            { id: "client", name: "client", role: "Client", kind: "client", logIndex: null, isolated: false, xRatio: 0.5, yRatio: 0.78 },
            { id: "node-a", name: "node-a", role: "Follower", kind: "raft", logIndex: 0, isolated: false, xRatio: 0.2, yRatio: 0.34 },
            { id: "node-b", name: "node-b", role: "Leader", kind: "raft", logIndex: 1, isolated: false, xRatio: 0.5, yRatio: 0.14 },
            { id: "node-c", name: "node-c", role: "Follower", kind: "raft", logIndex: 0, isolated: false, xRatio: 0.8, yRatio: 0.34 },
            { id: "node-d", name: "node-d", role: "Learner", kind: "raft", logIndex: 0, isolated: false, active: false, xRatio: 0.86, yRatio: 0.56 },
        ];
        this.term = 1;
        this.commitIndex = 1;
        this.pendingValue = "set value=42";
        this.queryPolicy = "LINEARIZABLE";
        this.requireMinCommitIndex = false;
        this.leaderId = "node-b";
        this.partitioned = false;
        this.lines = [];
        this.logItems = [];
        this.timelineItems = [];
        this.tourActive = false;
        this.tourAutoplay = false;
        this.tourIndex = -1;
        this.tourTimer = null;
        this.tourDelayMs = 3200;
        this.panelMode = "beginner";
        this.currentScenario = "none";
        this.lastRenderedOutcome = "";
        this.currentValue = "empty";
        this.stateByCommitIndex = { 1: "empty" };
        this.commandHistory = [];
        this.failedLeaderId = null;
        this.shareResetTimer = null;
        this.onboardingStorageKey = "mr-demo-onboarding-dismissed-v1";
        this.copy = {
            panelMode: {
                beginner:
                    "Beginner mode keeps the page focused on the main cluster story. Switch to Deep dive for the raw trace.",
                deep:
                    "Deep dive shows the trace, safety notes, raw events, and preset states.",
            },
            command: {
                "set value=42": {
                    buttonLabel: "Commit write",
                    helper:
                        "Write path: the leader appends the value, waits for follower acknowledgements, then commits on quorum.",
                },
                "compare-and-set value=42->84": {
                    buttonLabel: "Commit CAS",
                    helper:
                        "Conditional write: useful for showing ordered state changes and how a majority safely advances shared state.",
                },
                "get value": {
                    buttonLabel: "Run query",
                    helper:
                        "Use the query policy chooser to compare linearizable, leader-lease, and eventual-consistency reads.",
                },
            },
            queryPolicy: {
                LINEARIZABLE: {
                    help: "Linearizable reads confirm leadership with a quorum round before serving the query.",
                },
                LEADER_LEASE: {
                    help: "Leader-lease reads stay on the leader and trust heartbeat timing instead of a fresh quorum round.",
                },
                EVENTUAL: {
                    help: "Eventual reads can run on a follower and may be stale if that follower lags or is partitioned.",
                },
            },
            queryGuard: {
                disabled:
                    "Use the monotonic-read guard from the query docs so a lagging follower refuses to answer from older state.",
                enabled:
                    "This now simulates minCommitIndex. A follower read fails instead of returning stale state if it has not reached the latest observed commit.",
            },
            state: {
                healthy: {
                    title: "Local 3-node group, ready for a write",
                    body:
                        "Start with one normal write, then isolate node-c to see that progress depends on majority.",
                },
                partitioned: {
                    title: "Follower lost, majority still healthy",
                    body:
                        "node-c is isolated, but two Raft nodes still form quorum. Commit again or recover the follower.",
                },
                snapshotRecovery: {
                    title: "Follower far behind, snapshot catch-up in progress",
                    body:
                        "node-c fell far behind. The leader can help it jump forward with a snapshot.",
                },
                failover: {
                    title: "Leader lost, majority elected a replacement",
                    body:
                        "The old leader is gone, but two healthy nodes still form quorum and elect a replacement.",
                },
                backpressure: {
                    title: "Leader healthy, but temporarily rejecting new work",
                    body:
                        "The cluster is healthy, but the leader refuses another write because too much work is already pending.",
                },
                learner: {
                    title: "Learner joined, but quorum stayed the same",
                    body:
                        "node-d is catching up as a non-voting learner. Majority stays with the original three voters until promotion.",
                },
                promotedLearner: {
                    title: "Learner promoted, so quorum grew",
                    body:
                        "node-d is now a follower. The group has four voting members, so majority requires three nodes instead of two.",
                },
                fourNodeQuorum: {
                    title: "One follower lost, but 3-of-4 still commits",
                    body:
                        "After promotion, losing one follower still leaves three voting nodes. The cluster can keep committing, but it now needs all three votes.",
                },
                read: {
                    title: "Healthy leader, read path visible",
                    body:
                        "The cluster is healthy and the selected command is read-oriented. Run it to compare read paths.",
                },
            },
            nextAction: {
                tour: {
                    title: "Continue the guided tour",
                    body:
                        "Use Next to stay in the recommended order, or autoplay for the shortest walkthrough.",
                },
                partitioned: {
                    title: "Now prove quorum still commits",
                    body:
                        "Commit again while node-c is isolated, then recover it.",
                },
                snapshotRecovery: {
                    title: "Inspect the catch-up mechanism",
                    body:
                        "Open the trace and log to see recovery move state with a snapshot boundary.",
                },
                failover: {
                    title: "Commit after the failover",
                    body:
                        "Commit another command through the new leader.",
                },
                backpressure: {
                    title: "Back off, retry, or tune batching",
                    body:
                        "This is temporary overload, not quorum failure. Retry with backoff or inspect batching.",
                },
                learner: {
                    title: "Watch the learner catch up before promotion",
                    body:
                        "The learner receives the log, but quorum still depends on the three voting nodes.",
                },
                promotedLearner: {
                    title: "Notice the new quorum size",
                    body:
                        "Now that node-d votes, the group needs 3-of-4 voting nodes to keep committing safely.",
                },
                fourNodeQuorum: {
                    title: "See the new majority in action",
                    body:
                        "After promotion, lose one follower and commit again with the remaining three votes.",
                },
                initial: {
                    title: "Run the first replicated write",
                    body:
                        "Start with the healthy write preset.",
                },
                followUp: {
                    title: "Move to failure and recovery",
                    body:
                        "Move to loss and recovery to see that majority matters more than every follower.",
                },
            },
            scenario: {
                none: "No preset selected yet. Start with the healthy write.",
                happy:
                    "Healthy write selected. This is the normal leader append and quorum commit flow.",
                partition:
                    "Follower loss selected. The leader keeps committing with the remaining majority.",
                recovery:
                    "Recovery selected. The isolated follower reconnects and catches up.",
                snapshotRecovery:
                    "Snapshot catch-up selected. node-c falls far behind, then installs a snapshot and rejoins.",
                failover:
                    "Leader failover selected. The surviving majority elects a new leader in a higher term.",
                backpressure:
                    "Backpressure selected. The leader is healthy, but rejects a new write because the pending buffer is full.",
                learner:
                    "Learner selected. node-d joins as a non-voting member without increasing quorum.",
                promotedLearner:
                    "Promoted learner selected. node-d is now a follower, so majority grows from 2-of-3 to 3-of-4.",
                fourNodeQuorum:
                    "3-of-4 quorum selected. One follower is gone, but the remaining three voting nodes can still commit together.",
            },
            tour: {
                idle: {
                    title: "Follow the demo in the right order",
                    body:
                        "Use Back and Next to move through the preset states in docs order.",
                },
                complete: {
                    title: "Tour complete",
                    body:
                        "You have walked through the preset states from healthy replication to 3-of-4 quorum.",
                },
                steps: [
                {
                    title: "Step 1: Healthy write",
                    body:
                        "Start with the baseline preset. The leader accepts a write and quorum commits it.",
                    run: function () {
                        this.runHappyPath();
                    },
                },
                {
                    title: "Step 2: Follower loss",
                    body:
                        "Jump to the degraded preset. node-c is isolated, but two voting nodes still form quorum.",
                    run: function () {
                        this.runPartitionScenario();
                    },
                },
                {
                    title: "Step 3: Follower recovery",
                    body:
                        "Recover the lagging follower so it catches up and rejoins the healthy baseline.",
                    run: function () {
                        this.runRecoveryScenario();
                    },
                },
                {
                    title: "Step 4: Snapshot catch-up",
                    body:
                        "Look at the preset where a far-behind follower catches up through a snapshot.",
                    run: function () {
                        this.runSnapshotRecoveryScenario();
                    },
                },
                {
                    title: "Step 5: Leader failover",
                    body:
                        "Move to the failover preset. The old leader disappears and the surviving majority elects a new one.",
                    run: function () {
                        this.runFailoverScenario();
                    },
                },
                {
                    title: "Step 6: Backpressure under load",
                    body:
                        "See the operational preset where the leader stays healthy but rejects new work.",
                    run: function () {
                        this.runBackpressureScenario();
                    },
                },
                {
                    title: "Step 7: Add learner",
                    body:
                        "Add node-d as a learner. It catches up without changing the voting quorum yet.",
                    run: function () {
                        this.runLearnerScenario();
                    },
                },
                {
                    title: "Step 8: Promote learner",
                    body:
                        "Promote the caught-up learner to follower so the cluster moves from 2-of-3 to 3-of-4 voting members.",
                    run: function () {
                        this.runPromoteLearnerScenario();
                    },
                },
                {
                    title: "Step 9: 3-of-4 quorum",
                    body:
                        "After promotion, lose one follower and commit again with the remaining three votes.",
                    run: function () {
                        this.runFourNodeQuorumScenario();
                    },
                },
                ],
            },
        };
        this.tourSteps = this.copy.tour.steps;

        this.mount();
        this.bind();
        this.seed();
        this.restoreSharedState();
        this.render();
    }

    Demo.prototype.mount = function () {
        this.cluster = byId("mr-cluster");
        this.svg = byId("mr-demo-links");
        this.termValue = byId("mr-demo-term");
        this.leaderValue = byId("mr-demo-leader");
        this.commitValue = byId("mr-demo-commit");
        this.logList = byId("mr-demo-log");
        this.timelineList = byId("mr-demo-timeline");
        this.flowList = byId("mr-demo-flow");
        this.commandView = byId("mr-demo-command-view");
        this.quorumView = byId("mr-demo-quorum");
        this.quorumBadge = byId("mr-demo-quorum-badge");
        this.outcomeView = byId("mr-demo-outcome");
        this.outcomeCard = this.outcomeView ? this.outcomeView.closest(".mr-message-card") : null;
        this.registerValue = byId("mr-demo-register-value");
        this.commandHistoryList = byId("mr-demo-command-history");
        this.reportRoot = byId("mr-demo-report");
        this.shareButtons = bySelectorAll("[data-mr-demo-share]", this.root);
        this.onboarding = byId("mr-demo-onboarding");
        this.onboardingStartButton = byId("mr-demo-onboarding-start");
        this.onboardingExploreButton = byId("mr-demo-onboarding-explore");
        this.onboardingPersistInput = byId("mr-demo-onboarding-persist");
        this.onboardingCloseTargets = bySelectorAll("[data-mr-demo-onboarding-close]", this.root);
        this.canvasCard = bySelector(".mr-demo-canvas-card", this.root);
        this.explainerTitle = byId("mr-demo-explainer-title");
        this.explainerBody = byId("mr-demo-explainer-body");
        this.particleLayer = byId("mr-demo-particles");
        this.happyButton = byId("mr-demo-goal-healthy");
        this.partitionScenarioButton = byId("mr-demo-goal-quorum");
        this.recoveryScenarioButton = byId("mr-demo-goal-recovery");
        this.snapshotScenarioButton = byId("mr-demo-goal-snapshot");
        this.failoverScenarioButton = byId("mr-demo-goal-failover");
        this.backpressureScenarioButton = byId("mr-demo-goal-backpressure");
        this.learnerScenarioButton = byId("mr-demo-goal-learner");
        this.promoteLearnerScenarioButton = byId("mr-demo-goal-promote-learner");
        this.fourNodeQuorumScenarioButton = byId("mr-demo-goal-four-node-quorum");
        this.tourTitle = byId("mr-demo-tour-title");
        this.tourStep = byId("mr-demo-tour-step");
        this.tourBody = byId("mr-demo-tour-body");
        this.tourNextHint = byId("mr-demo-tour-next-hint");
        this.stepperItems = bySelectorAll("[data-mr-tour-jump]", this.root);
        this.tourSpeedSelect = byId("mr-demo-tour-speed");
        this.modeSummary = byId("mr-demo-mode-summary");
        this.stateTitle = byId("mr-demo-state-title");
        this.stateBody = byId("mr-demo-state-body");
        this.nextActionTitle = byId("mr-demo-next-action-title");
        this.nextActionBody = byId("mr-demo-next-action-body");
        this.scenarioStatus = byId("mr-demo-scenario-status");
        this.modeButtons = bySelectorAll("[data-mr-demo-mode]", this.root);
        this.modePanels = bySelectorAll("[data-mr-demo-view]", this.root);
        this.scenarioButtons = bySelectorAll(".mr-scenario", this.root);
        this.happyPathButton = byId("mr-demo-happy-path");
        this.tourStartButton = byId("mr-demo-tour-start");
        this.tourAutoButton = byId("mr-demo-tour-auto");
        this.tourBackButton = byId("mr-demo-tour-back");
        this.tourNextButton = byId("mr-demo-tour-next");
        this.tourStopButton = byId("mr-demo-tour-stop");

        for (var i = 0; i < this.nodes.length; i += 1) {
            var node = this.nodes[i];
            var card = document.createElement("div");
            card.className = "mr-node" + (node.kind === "client" ? " is-client" : "");
            card.id = node.id;
            var title = document.createElement("span");
            title.className = "mr-node-title";
            var role = document.createElement("span");
            role.className = "mr-node-role";
            var log = document.createElement("div");
            log.className = "mr-node-log";
            card.appendChild(title);
            card.appendChild(role);
            card.appendChild(log);
            this.cluster.appendChild(card);
        }

        this.createLink("node-a", "node-b");
        this.createLink("node-b", "node-c");
        this.createLink("node-a", "node-c");
        this.createLink("node-a", "node-d");
        this.createLink("node-b", "node-d");
        this.createLink("node-c", "node-d");
        this.positionNodes();
    };

    Demo.prototype.currentCommandMeta = function () {
        return this.copy.command[this.pendingValue] || this.copy.command["set value=42"];
    };

    Demo.prototype.currentTourStep = function () {
        return this.tourSteps[this.tourIndex];
    };

    Demo.prototype.setPendingCommand = function (value, logMessage) {
        this.pendingValue = value;
        if (logMessage) {
            this.pushLog("Input", 'Next atomic register command updated to "' + this.pendingValue + '".');
        }
        this.syncCommandCopy();
    };

    Demo.prototype.bindClick = function (node, handler) {
        if (!node) {
            return;
        }

        node.addEventListener("click", handler);
    };

    Demo.prototype.renderList = function (root, items, renderItem) {
        if (!root) {
            return;
        }

        root.innerHTML = "";
        for (var i = 0; i < items.length; i += 1) {
            root.appendChild(renderItem(items[i]));
        }
    };

    Demo.prototype.syncCommandCopy = function () {
        return this.currentCommandMeta();
    };

    Demo.prototype.setQueryPolicy = function (policy, logMessage) {
        if (!this.copy.queryPolicy[policy]) {
            return;
        }

        this.queryPolicy = policy;
        if (policy !== "EVENTUAL") {
            this.requireMinCommitIndex = false;
        }
        if (logMessage) {
            this.pushLog("Query", "Query policy changed to " + policy + ".");
        }
        this.syncCommandCopy();
    };

    Demo.prototype.toggleQueryGuard = function () {
        if (this.queryPolicy !== "EVENTUAL") {
            return;
        }

        this.requireMinCommitIndex = !this.requireMinCommitIndex;
        this.pushLog(
            "Query",
            this.requireMinCommitIndex
                ? "Eventual reads now require the latest observed commit index."
                : "Eventual reads can return the follower's local state again."
        );
        this.syncCommandCopy();
        this.render();
    };

    Demo.prototype.currentStateCopy = function () {
        if (this.currentScenario === "learner") {
            return this.copy.state.learner;
        }

        if (this.currentScenario === "promotedLearner") {
            return this.copy.state.promotedLearner;
        }

        if (this.currentScenario === "fourNodeQuorum") {
            return this.copy.state.fourNodeQuorum;
        }

        if (this.currentScenario === "failover") {
            return this.copy.state.failover;
        }

        if (this.currentScenario === "backpressure") {
            return this.copy.state.backpressure;
        }

        if (this.currentScenario === "snapshotRecovery") {
            return this.copy.state.snapshotRecovery;
        }

        if (this.partitioned) {
            return this.copy.state.partitioned;
        }

        if (this.pendingValue.indexOf("get") === 0) {
            return this.copy.state.read;
        }

        return this.copy.state.healthy;
    };

    Demo.prototype.renderStateSummary = function () {
        if (!this.stateTitle || !this.stateBody) {
            return;
        }

        var copy = this.currentStateCopy();
        text(this.stateTitle, copy.title);
        text(this.stateBody, copy.body);
    };

    Demo.prototype.currentNextActionCopy = function () {
        if (this.tourActive && this.tourIndex >= 0 && this.tourIndex < this.tourSteps.length) {
            return this.copy.nextAction.tour;
        }

        if (this.currentScenario === "learner") {
            return this.copy.nextAction.learner;
        }

        if (this.currentScenario === "promotedLearner") {
            return this.copy.nextAction.promotedLearner;
        }

        if (this.currentScenario === "fourNodeQuorum") {
            return this.copy.nextAction.fourNodeQuorum;
        }

        if (this.currentScenario === "failover") {
            return this.copy.nextAction.failover;
        }

        if (this.currentScenario === "backpressure") {
            return this.copy.nextAction.backpressure;
        }

        if (this.currentScenario === "snapshotRecovery") {
            return this.copy.nextAction.snapshotRecovery;
        }

        if (this.partitioned) {
            return this.copy.nextAction.partitioned;
        }

        if (this.commitIndex <= 1) {
            return this.copy.nextAction.initial;
        }

        return this.copy.nextAction.followUp;
    };

    Demo.prototype.renderNextAction = function () {
        if (!this.nextActionTitle || !this.nextActionBody) {
            return;
        }

        var copy = this.currentNextActionCopy();
        text(this.nextActionTitle, copy.title);
        text(this.nextActionBody, copy.body);
    };

    Demo.prototype.renderScenarioStatus = function () {
        if (this.scenarioStatus) {
            text(this.scenarioStatus, this.copy.scenario[this.currentScenario] || this.copy.scenario.none);
        }

        var scenarioToStepIndex = {
            happy: 0,
            partition: 1,
            recovery: 2,
            snapshotRecovery: 3,
            failover: 4,
            backpressure: 5,
            learner: 6,
            promotedLearner: 7,
            fourNodeQuorum: 8,
        };
        var activeScenarioStep = scenarioToStepIndex[this.currentScenario];

        this.scenarioButtons.forEach(
            function (button) {
                var id = button.id || "";
                var scenario = "none";
                if (id.indexOf("happy") >= 0 || id.indexOf("healthy") >= 0) {
                    scenario = "happy";
                } else if (id.indexOf("four-node-quorum") >= 0 || id.indexOf("3-of-4") >= 0) {
                    scenario = "fourNodeQuorum";
                } else if (id.indexOf("partition") >= 0 || id.indexOf("quorum") >= 0) {
                    scenario = "partition";
                } else if (id.indexOf("recovery") >= 0) {
                    scenario = "recovery";
                } else if (id.indexOf("snapshot") >= 0) {
                    scenario = "snapshotRecovery";
                } else if (id.indexOf("failover") >= 0) {
                    scenario = "failover";
                } else if (id.indexOf("backpressure") >= 0) {
                    scenario = "backpressure";
                } else if (id.indexOf("learner") >= 0) {
                    scenario = "learner";
                    if (id.indexOf("promote") >= 0) {
                        scenario = "promotedLearner";
                    }
                } else if (id.indexOf("4") >= 0) {
                    scenario = "fourNodeQuorum";
                }

                var isActive = scenario !== "none" && scenario === this.currentScenario;
                button.classList.toggle("is-active", isActive);
                button.setAttribute("aria-pressed", isActive ? "true" : "false");
            }.bind(this)
        );

        if (!this.tourActive && this.tourIndex < 0) {
            this.stepperItems.forEach(function (button, index) {
                button.classList.toggle("is-active", index === activeScenarioStep);
                button.classList.remove("is-complete");
            });
        }
    };

    Demo.prototype.setActionButtonState = function (button, title, detail) {
        if (!button) {
            return;
        }

        text(bySelector(".mr-demo-action-title", button), title);
        text(bySelector(".mr-demo-action-copy", button), detail);
        button.setAttribute("data-detail", detail);
    };

    Demo.prototype.renderControlStates = function () {
        var learnerNode = this.nodeById("node-d");
        if (this.learnerScenarioButton) {
            this.learnerScenarioButton.disabled = !!(learnerNode && learnerNode.active);
        }
        if (this.promoteLearnerScenarioButton) {
            this.promoteLearnerScenarioButton.disabled = !!(
                !learnerNode ||
                learnerNode.active === false ||
                learnerNode.role !== "Learner" ||
                learnerNode.logIndex < this.commitIndex
            );
        }
    };

    Demo.prototype.describeOperation = function () {
        if (this.pendingValue === "set value=42") {
            this.currentValue = "42";
            return {
                history: 'set "42"',
                outcome: "Value committed as 42",
                detail: "State updated to 42 on quorum commit.",
            };
        }

        if (this.pendingValue === "compare-and-set value=42->84") {
            if (this.currentValue === "42") {
                this.currentValue = "84";
                return {
                    history: "compare-and-set 42 -> 84",
                    outcome: "CAS committed and advanced value to 84",
                    detail: "CAS matched the current value and safely advanced state to 84.",
                };
            }

            return {
                history: "compare-and-set 42 -> 84",
                outcome: "CAS committed with no state change",
                detail: "The compare step did not match the current value, so the register stayed unchanged.",
            };
        }

        return {
            history: "read value",
            outcome: 'Read returned "' + this.currentValue + '"',
            detail: "Read path compared the current register value without changing committed state.",
        };
    };

    Demo.prototype.pushCommandHistory = function (index, command, detail) {
        this.commandHistory.unshift({
            index: index,
            command: command,
            detail: detail,
        });
        this.commandHistory = this.commandHistory.slice(0, 4);
    };

    Demo.prototype.positionNodes = function () {
        if (!this.cluster) {
            return;
        }

        var clusterWidth = this.cluster.clientWidth;
        var clusterHeight = this.cluster.clientHeight;
        var learnerActive = !!(this.nodeById("node-d") && this.nodeById("node-d").active);
        var layout = learnerActive
            ? clusterWidth < 520
                ? {
                      client: { xRatio: 0.5, yRatio: 0.84 },
                      "node-a": { xRatio: 0.14, yRatio: 0.4 },
                      "node-b": { xRatio: 0.42, yRatio: 0.14 },
                      "node-c": { xRatio: 0.68, yRatio: 0.34 },
                      "node-d": { xRatio: 0.86, yRatio: 0.56 },
                  }
                : clusterWidth < 760
                  ? {
                        client: { xRatio: 0.5, yRatio: 0.82 },
                        "node-a": { xRatio: 0.15, yRatio: 0.38 },
                        "node-b": { xRatio: 0.4, yRatio: 0.14 },
                        "node-c": { xRatio: 0.68, yRatio: 0.32 },
                        "node-d": { xRatio: 0.86, yRatio: 0.55 },
                    }
                  : {
                        client: { xRatio: 0.5, yRatio: 0.82 },
                        "node-a": { xRatio: 0.14, yRatio: 0.34 },
                        "node-b": { xRatio: 0.38, yRatio: 0.12 },
                        "node-c": { xRatio: 0.66, yRatio: 0.3 },
                        "node-d": { xRatio: 0.86, yRatio: 0.52 },
                    }
            : clusterWidth < 520
              ? {
                    client: { xRatio: 0.5, yRatio: 0.82 },
                    "node-a": { xRatio: 0.18, yRatio: 0.43 },
                    "node-b": { xRatio: 0.5, yRatio: 0.16 },
                    "node-c": { xRatio: 0.82, yRatio: 0.43 },
                }
              : clusterWidth < 760
                ? {
                      client: { xRatio: 0.5, yRatio: 0.8 },
                      "node-a": { xRatio: 0.16, yRatio: 0.37 },
                      "node-b": { xRatio: 0.5, yRatio: 0.14 },
                      "node-c": { xRatio: 0.84, yRatio: 0.37 },
                  }
                : {
                      client: { xRatio: 0.5, yRatio: 0.8 },
                      "node-a": { xRatio: 0.16, yRatio: 0.35 },
                      "node-b": { xRatio: 0.5, yRatio: 0.12 },
                      "node-c": { xRatio: 0.84, yRatio: 0.35 },
                  };

        for (var i = 0; i < this.nodes.length; i += 1) {
            var node = this.nodes[i];
            var card = byId(node.id);
            if (!card) {
                continue;
            }

            var cardWidth = card.offsetWidth || (node.kind === "client" ? 164 : 148);
            var cardHeight = card.offsetHeight || 150;
            var point = layout[node.id] || node;
            var left = clusterWidth * point.xRatio - cardWidth / 2;
            var top = clusterHeight * point.yRatio - cardHeight / 2;
            var minLeft = Math.max(12, clusterWidth * 0.03);
            var maxLeft = Math.max(minLeft, clusterWidth - cardWidth - minLeft);
            var minTop = Math.max(10, clusterHeight * 0.03);
            var maxTop = Math.max(minTop, clusterHeight - cardHeight - minTop);

            card.style.left = Math.min(maxLeft, Math.max(minLeft, left)) + "px";
            card.style.top = Math.min(maxTop, Math.max(minTop, top)) + "px";
        }
    };

    Demo.prototype.createLink = function (fromId, toId) {
        var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("class", "mr-link");
        line.setAttribute("data-from", fromId);
        line.setAttribute("data-to", toId);
        this.svg.appendChild(line);
        this.lines.push(line);
    };

    Demo.prototype.bind = function () {
        var self = this;
        this.bindClick(this.happyButton, function () {
            self.runHappyPath();
        });
        this.bindClick(byId("mr-demo-scenario-happy-deep"), function () {
            self.runHappyPath();
        });
        this.bindClick(this.partitionScenarioButton, function () {
            self.runPartitionScenario();
        });
        this.bindClick(byId("mr-demo-scenario-partition-deep"), function () {
            self.runPartitionScenario();
        });
        this.bindClick(this.recoveryScenarioButton, function () {
            self.runRecoveryScenario();
        });
        this.bindClick(byId("mr-demo-scenario-recovery-deep"), function () {
            self.runRecoveryScenario();
        });
        this.bindClick(this.snapshotScenarioButton, function () {
            self.runSnapshotRecoveryScenario();
        });
        this.bindClick(byId("mr-demo-scenario-snapshot-deep"), function () {
            self.runSnapshotRecoveryScenario();
        });
        this.bindClick(this.failoverScenarioButton, function () {
            self.runFailoverScenario();
        });
        this.bindClick(byId("mr-demo-scenario-failover-deep"), function () {
            self.runFailoverScenario();
        });
        this.bindClick(this.backpressureScenarioButton, function () {
            self.runBackpressureScenario();
        });
        this.bindClick(byId("mr-demo-scenario-backpressure-deep"), function () {
            self.runBackpressureScenario();
        });
        this.bindClick(this.learnerScenarioButton, function () {
            self.runLearnerScenario();
        });
        this.bindClick(byId("mr-demo-scenario-learner-deep"), function () {
            self.runLearnerScenario();
        });
        this.bindClick(this.promoteLearnerScenarioButton, function () {
            self.runPromoteLearnerScenario();
        });
        this.bindClick(byId("mr-demo-scenario-promote-learner-deep"), function () {
            self.runPromoteLearnerScenario();
        });
        this.bindClick(this.fourNodeQuorumScenarioButton, function () {
            self.runFourNodeQuorumScenario();
        });
        this.bindClick(byId("mr-demo-scenario-four-node-quorum-deep"), function () {
            self.runFourNodeQuorumScenario();
        });
        this.bindClick(this.happyPathButton, function () {
            self.runHappyPath();
        });
        this.shareButtons.forEach(function (button) {
            self.bindClick(button, function () {
                self.copyShareLink(button);
            });
        });
        this.bindClick(this.onboardingStartButton, function () {
            self.dismissOnboarding(true);
            self.startTour();
            self.root.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        this.bindClick(this.onboardingExploreButton, function () {
            self.dismissOnboarding(true);
        });
        this.onboardingCloseTargets.forEach(function (node) {
            self.bindClick(node, function () {
                self.dismissOnboarding(true);
            });
        });
        this.modeButtons.forEach(function (button) {
            self.bindClick(button, function () {
                self.setPanelMode(button.getAttribute("data-mr-demo-mode") || "beginner");
            });
        });
        this.bindClick(this.tourStartButton, function () {
            self.startTour();
        });
        this.bindClick(this.tourAutoButton, function () {
            self.startAutoplayTour();
        });
        this.stepperItems.forEach(function (button) {
            self.bindClick(button, function () {
                self.jumpToTourStep(Number(button.getAttribute("data-mr-tour-jump")));
            });
        });
        this.tourSpeedSelect.addEventListener("change", function () {
            self.tourDelayMs = Number(self.tourSpeedSelect.value) || 3200;
            if (self.tourAutoplay) {
                self.scheduleAutoplayStep();
            }
        });
        this.bindClick(this.tourBackButton, function () {
            self.backTour();
        });
        this.bindClick(this.tourNextButton, function () {
            self.advanceTour();
        });
        this.bindClick(this.tourStopButton, function () {
            self.stopTour();
        });
        window.addEventListener("resize", function () {
            self.positionNodes();
            self.renderLinks();
        });
        this.setPanelMode(this.panelMode);
        this.syncCommandCopy();
        this.maybeOpenOnboarding();
    };

    Demo.prototype.readOnboardingDismissed = function () {
        try {
            return window.localStorage.getItem(this.onboardingStorageKey) === "1";
        } catch (error) {
            return false;
        }
    };

    Demo.prototype.writeOnboardingDismissed = function () {
        try {
            window.localStorage.setItem(this.onboardingStorageKey, "1");
        } catch (error) {
            return;
        }
    };

    Demo.prototype.shouldPersistOnboardingDismissal = function () {
        return !!(this.onboardingPersistInput && this.onboardingPersistInput.checked);
    };

    Demo.prototype.maybeOpenOnboarding = function () {
        if (!this.onboarding) {
            return;
        }

        if ((window.location.hash || "").indexOf("#demo=") === 0 || this.readOnboardingDismissed()) {
            this.onboarding.hidden = true;
            return;
        }

        if (this.onboardingPersistInput) {
            this.onboardingPersistInput.checked = false;
        }
        this.onboarding.hidden = false;
        document.body.classList.add("mr-demo-onboarding-open");
    };

    Demo.prototype.dismissOnboarding = function (persist) {
        if (!this.onboarding) {
            return;
        }

        this.onboarding.hidden = true;
        document.body.classList.remove("mr-demo-onboarding-open");
        if (persist && this.shouldPersistOnboardingDismissal()) {
            this.writeOnboardingDismissed();
        }
    };

    Demo.prototype.encodeShareState = function (snapshot) {
        return btoa(unescape(encodeURIComponent(JSON.stringify(snapshot))))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");
    };

    Demo.prototype.decodeShareState = function (encoded) {
        if (typeof encoded !== "string" || encoded.length > 20000) {
            throw new Error("Invalid shared demo state.");
        }

        var normalized = (encoded || "").replace(/-/g, "+").replace(/_/g, "/");
        while (normalized.length % 4 !== 0) {
            normalized += "=";
        }

        return JSON.parse(decodeURIComponent(escape(atob(normalized))));
    };

    Demo.prototype.currentShareState = function () {
        return {
            term: this.term,
            commitIndex: this.commitIndex,
            pendingValue: this.pendingValue,
            queryPolicy: this.queryPolicy,
            requireMinCommitIndex: this.requireMinCommitIndex,
            leaderId: this.leaderId,
            partitioned: this.partitioned,
            panelMode: this.panelMode,
            currentScenario: this.currentScenario,
            currentValue: this.currentValue,
            stateByCommitIndex: this.stateByCommitIndex,
            failedLeaderId: this.failedLeaderId,
            lastOutcome: this.lastOutcome,
            explainerHeading: this.explainerHeading,
            explainerText: this.explainerText,
            flowItems: this.flowItems,
            logItems: this.logItems,
            timelineItems: this.timelineItems,
            commandHistory: this.commandHistory,
            nodes: this.nodes.map(function (node) {
                return {
                    id: node.id,
                    logIndex: node.logIndex,
                    isolated: node.isolated,
                    active: node.active !== false,
                    role: node.role,
                };
            }),
        };
    };

    Demo.prototype.applyShareState = function (snapshot) {
        if (!snapshot || !Array.isArray(snapshot.nodes)) {
            return false;
        }

        var allowedCommands = {
            "set value=42": true,
            "compare-and-set value=42->84": true,
            "get value": true,
        };
        var allowedPolicies = {
            LINEARIZABLE: true,
            LEADER_LEASE: true,
            EVENTUAL: true,
        };
        var allowedPanelModes = {
            beginner: true,
            deep: true,
        };
        var allowedScenarios = {
            none: true,
            happy: true,
            partition: true,
            recovery: true,
            snapshotRecovery: true,
            failover: true,
            backpressure: true,
            learner: true,
            promotedLearner: true,
            fourNodeQuorum: true,
        };
        var allowedRoles = {
            Leader: true,
            Follower: true,
            Learner: true,
            Client: true,
        };

        this.clearTourTimer();
        this.tourActive = false;
        this.tourAutoplay = false;
        this.tourIndex = -1;
        this.term = safeInteger(snapshot.term, 1, 1, 100000);
        this.commitIndex = safeInteger(snapshot.commitIndex, 1, 1, 100000);
        this.pendingValue = allowedCommands[snapshot.pendingValue] ? snapshot.pendingValue : "set value=42";
        this.queryPolicy = allowedPolicies[snapshot.queryPolicy] ? snapshot.queryPolicy : "LINEARIZABLE";
        this.requireMinCommitIndex = !!snapshot.requireMinCommitIndex;
        this.leaderId = /^node-[abcd]$/.test(snapshot.leaderId) ? snapshot.leaderId : "node-b";
        this.partitioned = !!snapshot.partitioned;
        this.panelMode = allowedPanelModes[snapshot.panelMode] ? snapshot.panelMode : "beginner";
        this.currentScenario = allowedScenarios[snapshot.currentScenario] ? snapshot.currentScenario : "none";
        this.currentValue = safeString(snapshot.currentValue, "empty", 80);
        this.stateByCommitIndex = { 1: "empty" };
        if (snapshot.stateByCommitIndex && typeof snapshot.stateByCommitIndex === "object") {
            Object.keys(snapshot.stateByCommitIndex)
                .slice(0, 64)
                .forEach(
                    function (key) {
                        var index = Number(key);
                        if (!Number.isInteger(index) || index < 1 || index > 100000) {
                            return;
                        }
                        this.stateByCommitIndex[index] = safeString(snapshot.stateByCommitIndex[key], "empty", 80);
                    }.bind(this)
                );
        }
        this.failedLeaderId = /^node-[abc]$/.test(snapshot.failedLeaderId || "") ? snapshot.failedLeaderId : null;
        this.lastOutcome = safeString(snapshot.lastOutcome, "Ready to replicate", 180);
        this.explainerHeading = safeString(snapshot.explainerHeading, "", 220);
        this.explainerText = safeString(snapshot.explainerText, "", 500);
        this.flowItems = safeStringList(snapshot.flowItems, 12, 240);
        this.logItems = safeHistoryList(
            (snapshot.logItems || []).map(function (entry) {
                return entry && typeof entry === "object"
                    ? { index: 1, command: safeString(entry.tag, "", 40), detail: safeString(entry.message, "", 240) }
                    : null;
            })
        ).map(function (entry) {
            return { tag: entry.command, message: entry.detail };
        });
        this.timelineItems = (Array.isArray(snapshot.timelineItems) ? snapshot.timelineItems : [])
            .slice(0, 12)
            .filter(function (entry) {
                return entry && typeof entry === "object";
            })
            .map(function (entry) {
                return {
                    time: safeString(entry.time, "--:--:--", 32),
                    label: safeString(entry.label, "", 180),
                };
            });
        this.commandHistory = safeHistoryList(snapshot.commandHistory);

        snapshot.nodes.forEach(
            function (sharedNode) {
                var node = this.nodeById(sharedNode.id);
                if (!node) {
                    return;
                }
                node.logIndex = safeInteger(sharedNode.logIndex, node.logIndex, 0, 100000);
                node.isolated = !!sharedNode.isolated;
                node.active = sharedNode.active !== false;
                node.role = allowedRoles[sharedNode.role] ? sharedNode.role : node.role;
            }.bind(this)
        );

        this.setPanelMode(this.panelMode);
        this.syncCommandCopy();
        return true;
    };

    Demo.prototype.restoreSharedState = function () {
        var hash = window.location.hash || "";
        var match = hash.match(/^#demo=([^&]+)/);
        if (!match) {
            return;
        }

        try {
            this.applyShareState(this.decodeShareState(match[1]));
        } catch (error) {
            if (window.console && window.console.warn) {
                window.console.warn("Failed to restore shared demo state.", error);
            }
        }
    };

    Demo.prototype.copyShareLink = function (button) {
        var url = new URL(window.location.href);
        url.hash = "demo=" + this.encodeShareState(this.currentShareState());
        var textToCopy = url.toString();
        var self = this;

        var onSuccess = function () {
            self.shareButtons.forEach(function (node) {
                var label = bySelector(".mr-demo-share-label", node);
                var icon = bySelector(".fa-solid", node);
                node.classList.toggle("is-copied", node === button);
                if (icon) {
                    icon.className = node === button ? "fa-solid fa-check" : "fa-solid fa-link";
                }
                if (label) {
                    label.textContent = node === button ? "Link copied" : "Copy state link";
                }
            });
            window.clearTimeout(self.shareResetTimer);
            self.shareResetTimer = window.setTimeout(function () {
                self.shareButtons.forEach(function (node) {
                    var label = bySelector(".mr-demo-share-label", node);
                    var icon = bySelector(".fa-solid", node);
                    node.classList.remove("is-copied");
                    if (icon) {
                        icon.className = "fa-solid fa-link";
                    }
                    if (label) {
                        label.textContent = "Copy state link";
                    }
                });
            }, 1400);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy).then(onSuccess);
            return;
        }

        var temp = document.createElement("input");
        temp.value = textToCopy;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
        onSuccess();
    };

    Demo.prototype.focusCluster = function (nodeIds) {
        var ids = Array.isArray(nodeIds) ? nodeIds : [];
        var self = this;
        var scrollTarget = this.cluster || this.canvasCard;

        if (this.canvasCard) {
            this.canvasCard.classList.remove("is-attention");
            void this.canvasCard.offsetWidth;
            this.canvasCard.classList.add("is-attention");

            var rect = scrollTarget ? scrollTarget.getBoundingClientRect() : this.canvasCard.getBoundingClientRect();
            var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            var mostlyVisible = rect.top >= 72 && rect.bottom <= viewportHeight - 24;

            if (!mostlyVisible && scrollTarget) {
                scrollTarget.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }

            window.setTimeout(function () {
                if (self.canvasCard) {
                    self.canvasCard.classList.remove("is-attention");
                }
            }, 1100);
        }

        ids.forEach(function (id) {
            var node = byId(id);
            if (!node) {
                return;
            }
            node.classList.remove("is-attention");
            void node.offsetWidth;
            node.classList.add("is-attention");
            window.setTimeout(function () {
                node.classList.remove("is-attention");
            }, 1300);
        });
    };

    Demo.prototype.setPanelMode = function (mode) {
        this.panelMode = mode === "deep" ? "deep" : "beginner";
        if (this.root) {
            this.root.setAttribute("data-mr-demo-mode", this.panelMode);
        }
        this.modeButtons.forEach(
            function (button) {
                var isActive = button.getAttribute("data-mr-demo-mode") === this.panelMode;
                button.classList.toggle("is-active", isActive);
                button.setAttribute("aria-selected", isActive ? "true" : "false");
            }.bind(this)
        );
        this.modePanels.forEach(
            function (panel) {
                var shouldShow = panel.getAttribute("data-mr-demo-view") === this.panelMode;
                panel.hidden = !shouldShow;
            }.bind(this)
        );
        text(this.modeSummary, this.copy.panelMode[this.panelMode]);
    };

    Demo.prototype.seed = function () {
        this.pushTimeline("Cluster boot");
        this.pushLog("Boot", "3-node local tutorial cluster started.");
        this.pushTimeline("Leader elected");
        this.pushLog("Election", "node-b becomes leader for term 1.");
        this.pushTimeline("Initial commit");
        this.pushLog("Commit", "Initial atomic register value committed at index 1.");
        this.explainerHeading = "This mirrors the local tutorial harness, not an external cluster product.";
        this.explainerText =
            "A healthy leader accepts the atomic register command, replicates it to followers, and commits once quorum acknowledges the entry.";
        this.flowItems = [
            "Client sends an atomic register command to the current leader.",
            "Leader appends the entry to its local log.",
            "Leader replicates the entry to followers and waits for quorum.",
            "Once quorum acknowledges, the entry is committed.",
        ];
        this.currentScenario = "none";
        this.failedLeaderId = null;
        this.syncCommandCopy();
        this.renderTour();
    };

    Demo.prototype.stateAtCommitIndex = function (index) {
        var value = "empty";
        var commit = 1;
        while (commit <= index) {
            if (Object.prototype.hasOwnProperty.call(this.stateByCommitIndex, commit)) {
                value = this.stateByCommitIndex[commit];
            }
            commit += 1;
        }
        return value;
    };

    Demo.prototype.firstHealthyFollower = function () {
        for (var i = 0; i < this.nodes.length; i += 1) {
            var node = this.nodes[i];
            if (this.isVotingRaftNode(node) && node.id !== this.leaderId && !node.isolated) {
                return node;
            }
        }
        return null;
    };

    Demo.prototype.executeQuery = function () {
        var leader = this.nodeById(this.leaderId);
        var resultValue = this.currentValue;
        var outcome;
        var detail;

        this.emitParticle("client", this.leaderId, "query", "client");

        if (this.queryPolicy === "LINEARIZABLE") {
            for (var i = 0; i < this.nodes.length; i += 1) {
                if (this.nodes[i].kind === "raft" && this.nodes[i].id !== this.leaderId && !this.nodes[i].isolated) {
                    this.emitParticle(this.leaderId, this.nodes[i].id, "qseq", "replication");
                    this.emitParticle(this.nodes[i].id, this.leaderId, "ack", "replication");
                }
            }
            outcome = 'Linearizable read returned "' + resultValue + '"';
            detail = "Leader confirmed it still held authority before serving the query.";
            this.flowItems = [
                "Client sends the query to " + leader.name + ".",
                leader.name + " runs a lightweight quorum round to confirm it is still leader.",
                "Followers acknowledge the query sequence number without growing the log.",
                'The leader serves the latest committed value "' + resultValue + '".',
            ];
            this.explainerHeading = "This read pays for freshness, not for log growth.";
            this.explainerText =
                "MicroRaft can serve a linearizable query without appending it to the log, but it still confirms leadership with the majority first.";
        } else if (this.queryPolicy === "LEADER_LEASE") {
            this.emitParticle(this.leaderId, "client", "lease", "client");
            outcome = 'Leader-lease read returned "' + resultValue + '"';
            detail = "Leader served the query locally under heartbeat-based lease assumptions.";
            this.flowItems = [
                "Client sends the query to the current leader.",
                "The leader serves the query locally without a fresh quorum round.",
                "Correctness depends on heartbeat timeout assumptions staying valid.",
                'The result still reflects the leader view of "' + resultValue + '".',
            ];
            this.explainerHeading = "Leader-lease reads are faster because they trust timing assumptions.";
            this.explainerText =
                "This avoids a fresh quorum round, but it is only safe while the heartbeat timeout assumptions that protect the leader lease hold.";
        } else {
            var follower = this.firstHealthyFollower() || this.nodeById("node-c") || leader;
            var followerCommit = follower && follower.kind === "raft" ? follower.logIndex : this.commitIndex;
            this.emitParticle("client", follower.id, "local", "recovery");
            if (this.requireMinCommitIndex && followerCommit < this.commitIndex) {
                outcome = "Eventual read blocked by min commit index";
                detail =
                    follower.name +
                    " is only at commit index " +
                    followerCommit +
                    ", but the client requires at least " +
                    this.commitIndex +
                    " before it will accept a local read.";
                this.flowItems = [
                    "Client targets a follower for a local eventual read.",
                    "The client carries its last observed commit index as a freshness floor.",
                    follower.name + " checks its local commit index " + followerCommit + " against required commit index " + this.commitIndex + ".",
                    "Because the follower is behind, the read is rejected instead of returning stale state.",
                ];
                this.explainerHeading = "This is the minCommitIndex guard from the query docs.";
                this.explainerText =
                    "MicroRaft lets clients protect monotonic reads and read-your-writes behavior by requiring a minimum commit index before a local eventual read can succeed.";
            } else {
                resultValue = this.stateAtCommitIndex(followerCommit);
                outcome = 'Eventual read on ' + follower.name + ' returned "' + resultValue + '"';
                detail =
                    followerCommit < this.commitIndex
                        ? "Follower served a stale but locally available result."
                        : "Follower served its local committed state without talking to the leader.";
                this.flowItems = [
                    "Client targets a follower for the query instead of the leader.",
                    follower.name + " answers from its local applied state at commit index " + followerCommit + ".",
                    followerCommit < this.commitIndex
                        ? "Because the follower lags, the result can be older than the latest leader state."
                        : "Because the follower is caught up, the result matches the latest committed state.",
                    "This policy trades freshness for lower coordination cost and read fan-out.",
                ];
                this.explainerHeading = "Eventual reads can scale out, but they can also go stale.";
                this.explainerText =
                    "This is the policy from the queries doc that lets followers answer locally. When a follower lags or is partitioned, the read can return an older value.";
            }
        }

        this.pushLog("Query", detail);
        this.pushTimeline("Query served");
        this.pushCommandHistory(this.commitIndex, "query " + this.queryPolicy.toLowerCase(), detail);
        this.lastOutcome = outcome;
        this.focusCluster([this.leaderId].concat(this.queryPolicy === "EVENTUAL" ? ["node-c"] : []));
        this.render();
    };

    Demo.prototype.pushLog = function (tag, message) {
        this.logItems.unshift({ tag: tag, message: message });
        this.logItems = this.logItems.slice(0, 8);
    };

    Demo.prototype.pushTimeline = function (label) {
        var time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        this.timelineItems.unshift({ label: label, time: time });
        this.timelineItems = this.timelineItems.slice(0, 6);
    };

    Demo.prototype.startTour = function () {
        this.clearTourTimer();
        this.reset();
        this.tourActive = true;
        this.tourAutoplay = false;
        this.tourIndex = 0;
        this.pushLog("Tour", "Guided tour started.");
        this.render();
    };

    Demo.prototype.startAutoplayTour = function () {
        this.clearTourTimer();
        this.reset();
        this.tourActive = true;
        this.tourAutoplay = true;
        this.tourIndex = 0;
        this.pushLog("Tour", "Autoplay tour started.");
        this.render();
        this.showUpcomingStep();
    };

    Demo.prototype.jumpToTourStep = function (index) {
        if (Number.isNaN(index) || index < 0 || index >= this.tourSteps.length) {
            return;
        }

        this.clearTourTimer();
        this.reset();
        this.tourActive = true;
        this.tourAutoplay = false;

        for (var i = 0; i <= index; i += 1) {
            this.tourIndex = i;
            this.tourSteps[i].run.call(this);
        }

        this.tourIndex = index;
        this.pushLog("Tour", "Walkthrough jumped to step " + (index + 1) + ".");
        this.render();
    };

    Demo.prototype.backTour = function () {
        if (this.tourAutoplay) {
            return;
        }

        if (this.tourIndex <= 0) {
            this.stopTour();
            return;
        }

        this.jumpToTourStep(this.tourIndex - 1);
    };

    Demo.prototype.advanceTour = function () {
        if (!this.tourActive || this.tourIndex < 0) {
            this.startTour();
            return;
        }

        if (this.tourIndex >= this.tourSteps.length) {
            return;
        }

        var step = this.tourSteps[this.tourIndex];
        if (step && typeof step.run === "function") {
            step.run.call(this);
        }

        if (this.tourIndex >= this.tourSteps.length - 1) {
            this.tourIndex = this.tourSteps.length;
            this.pushLog("Tour", "Guided tour completed.");
        } else {
            this.tourIndex += 1;
        }

        this.render();
        if (this.tourAutoplay) {
            this.scheduleAutoplayStep();
        }
    };

    Demo.prototype.stopTour = function () {
        if (!this.tourActive && this.tourIndex < 0) {
            return;
        }

        this.clearTourTimer();
        this.tourActive = false;
        this.tourAutoplay = false;
        this.tourIndex = -1;
        this.pushLog("Tour", "Guided tour exited.");
        this.render();
    };

    Demo.prototype.scheduleAutoplayStep = function () {
        var self = this;
        this.clearTourTimer();
        if (!this.tourAutoplay || !this.tourActive || this.tourIndex < 0 || this.tourIndex >= this.tourSteps.length) {
            return;
        }
        this.tourTimer = window.setTimeout(function () {
            self.advanceTour();
        }, this.tourDelayMs);
    };

    Demo.prototype.showUpcomingStep = function () {
        var self = this;
        this.clearTourTimer();
        if (!this.tourAutoplay || !this.tourActive || this.tourIndex < 0 || this.tourIndex >= this.tourSteps.length) {
            return;
        }

        var step = this.currentTourStep();
        if (this.tourNextHint && step) {
            this.tourNextHint.hidden = false;
            text(this.tourNextHint, "Coming next: " + step.title.replace(/^Step \d+:\s*/, "").toLowerCase() + ".");
        }

        this.tourTimer = window.setTimeout(function () {
            if (self.tourNextHint) {
                self.tourNextHint.hidden = true;
            }
            self.advanceTour();
        }, Math.max(1200, Math.round(this.tourDelayMs * 0.42)));
    };

    Demo.prototype.clearTourTimer = function () {
        if (this.tourTimer) {
            window.clearTimeout(this.tourTimer);
            this.tourTimer = null;
        }
    };

    Demo.prototype.renderTour = function () {
        if (
            !this.tourTitle ||
            !this.tourStep ||
            !this.tourBody ||
            !this.tourNextHint ||
            !this.tourStartButton ||
            !this.tourAutoButton ||
            !this.tourBackButton ||
            !this.tourNextButton ||
            !this.tourStopButton
        ) {
            return;
        }

        if (!this.tourActive && this.tourIndex < 0) {
            text(this.tourTitle, this.copy.tour.idle.title);
            text(this.tourStep, "Not started");
            text(this.tourBody, this.copy.tour.idle.body);
            this.stepperItems.forEach(function (button) {
                button.classList.remove("is-active", "is-complete");
                button.setAttribute("aria-current", "false");
            });
            this.tourStartButton.disabled = false;
            this.tourStartButton.textContent = "Start walkthrough";
            this.tourAutoButton.disabled = false;
            this.tourAutoButton.textContent = "Autoplay tour";
            this.tourBackButton.disabled = true;
            this.tourNextButton.disabled = false;
            this.tourNextButton.textContent = "Start with step 1";
            this.tourStopButton.disabled = true;
            this.tourNextHint.hidden = true;
            return;
        }

        if (this.tourIndex >= this.tourSteps.length) {
            text(this.tourTitle, this.copy.tour.complete.title);
            text(this.tourStep, this.tourSteps.length + "/" + this.tourSteps.length);
            text(this.tourBody, this.copy.tour.complete.body);
            this.tourActive = false;
            this.tourAutoplay = false;
            this.clearTourTimer();
            this.stepperItems.forEach(function (button) {
                button.classList.add("is-complete");
                button.classList.remove("is-active");
                button.setAttribute("aria-current", "false");
            });
            this.tourStartButton.disabled = false;
            this.tourStartButton.textContent = "Restart walkthrough";
            this.tourAutoButton.disabled = false;
            this.tourAutoButton.textContent = "Autoplay tour";
            this.tourBackButton.disabled = false;
            this.tourNextButton.disabled = true;
            this.tourNextButton.textContent = "Finished";
            this.tourStopButton.disabled = false;
            this.tourNextHint.hidden = true;
            return;
        }

        var step = this.currentTourStep();
        this.stepperItems.forEach(
            function (button, index) {
                button.classList.toggle("is-active", index === this.tourIndex);
                button.classList.toggle("is-complete", index < this.tourIndex);
                button.setAttribute("aria-current", index === this.tourIndex ? "step" : "false");
            }.bind(this)
        );
        text(this.tourTitle, step.title);
        text(this.tourStep, this.tourIndex + 1 + "/" + this.tourSteps.length);
        text(this.tourBody, step.body);
        this.tourStartButton.disabled = true;
        this.tourStartButton.textContent = "Start walkthrough";
        this.tourAutoButton.disabled = this.tourAutoplay;
        this.tourAutoButton.textContent = this.tourAutoplay ? "Autoplaying..." : "Autoplay tour";
        this.tourBackButton.disabled = this.tourAutoplay || this.tourIndex === 0;
        this.tourNextButton.disabled = this.tourAutoplay;
        this.tourNextButton.textContent = this.tourIndex === this.tourSteps.length - 1 ? "Finish walkthrough" : "Next";
        this.tourStopButton.disabled = false;
        if (!this.tourAutoplay) {
            this.tourNextHint.hidden = true;
        }
    };

    Demo.prototype.nodeById = function (id) {
        for (var i = 0; i < this.nodes.length; i += 1) {
            if (this.nodes[i].id === id) {
                return this.nodes[i];
            }
        }
        return null;
    };

    Demo.prototype.isVotingRaftNode = function (node) {
        return !!(node && node.kind === "raft" && node.role !== "Learner" && node.active !== false);
    };

    Demo.prototype.activeLearnerCount = function () {
        var count = 0;
        for (var i = 0; i < this.nodes.length; i += 1) {
            if (this.nodes[i].kind === "raft" && this.nodes[i].role === "Learner" && this.nodes[i].active !== false) {
                count += 1;
            }
        }
        return count;
    };

    Demo.prototype.totalVotingCount = function () {
        var count = 0;
        for (var i = 0; i < this.nodes.length; i += 1) {
            if (this.isVotingRaftNode(this.nodes[i])) {
                count += 1;
            }
        }
        return count;
    };

    Demo.prototype.majorityThreshold = function () {
        return Math.floor(this.totalVotingCount() / 2) + 1;
    };

    Demo.prototype.electNextLeader = function () {
        this.term += 1;
        var available = this.nodes.filter(function (node) {
            return this.isVotingRaftNode(node) && !node.isolated;
        }.bind(this));
        if (!available.length) {
            return;
        }

        var currentIndex = 0;
        for (var i = 0; i < available.length; i += 1) {
            if (available[i].id === this.leaderId) {
                currentIndex = i;
                break;
            }
        }

        var nextLeader = available[(currentIndex + 1) % available.length];
        this.leaderId = nextLeader.id;
        this.lastOutcome = "Leader rotated to " + nextLeader.name;
        this.pushTimeline("Term " + this.term + " election");
        for (var j = 0; j < available.length; j += 1) {
            if (available[j].id !== nextLeader.id) {
                this.emitParticle(available[j].id, nextLeader.id, "vote", "election");
            }
        }
        this.flowItems = [
            nextLeader.name + " starts a new election round.",
            "Healthy followers vote in the new term.",
            "The candidate with quorum becomes leader.",
            "Clients should now send writes to " + nextLeader.name + ".",
        ];
        this.explainerHeading = nextLeader.name + " is now the write entry point.";
        this.explainerText =
            "Leader changes are normal in Raft. What matters is that a majority can still communicate and elect a single new leader for the new term.";
        this.pushLog("Election", nextLeader.name + " becomes leader for term " + this.term + ".");
        this.focusCluster(
            available.map(function (node) {
                return node.id;
            })
        );
        this.render();
    };

    Demo.prototype.replicate = function () {
        if (this.pendingValue === "get value") {
            this.executeQuery();
            return;
        }

        var leader = this.nodeById(this.leaderId);
        if (!leader || leader.isolated) {
            this.pushTimeline("Replication blocked");
            this.lastOutcome = "No quorum-backed leader available";
            this.flowItems = [
                "Client sends a command, but no healthy leader can accept it.",
                "Replication cannot begin without a leader.",
                "The cluster must recover communication or elect a healthy leader.",
            ];
            this.explainerHeading = "Replication is blocked because the cluster cannot rely on a healthy leader.";
            this.explainerText =
                "Without a reachable leader backed by quorum, a write cannot be safely accepted. Recovery or a new election must happen first.";
            this.pushLog("Blocked", "No healthy leader can replicate the command.");
            this.render();
            return;
        }

        this.commitIndex += 1;
        var healthyFollowers = 0;
        var operation = this.describeOperation();
        this.emitParticle("client", this.leaderId, this.pendingValue.indexOf("get") === 0 ? "query" : "write", "client");
        for (var i = 0; i < this.nodes.length; i += 1) {
            if (this.nodes[i].kind === "raft" && !this.nodes[i].isolated) {
                this.nodes[i].logIndex = this.commitIndex;
                if (this.nodes[i].id !== this.leaderId) {
                    healthyFollowers += 1;
                }
            }
        }

        this.pushLog(
            "Replicate",
            leader.name + " commits \"" + this.pendingValue + "\" at index " + this.commitIndex + " with " + healthyFollowers + " follower acknowledgement(s)."
        );
        this.pushCommandHistory(this.commitIndex, operation.history, operation.detail);
        this.stateByCommitIndex[this.commitIndex] = this.currentValue;
        this.pushTimeline("Commit index " + this.commitIndex);
        for (var j = 0; j < this.nodes.length; j += 1) {
            if (this.nodes[j].kind === "raft" && this.nodes[j].id !== this.leaderId && !this.nodes[j].isolated) {
                this.emitParticle(this.leaderId, this.nodes[j].id, "append", "replication");
                this.emitParticle(this.nodes[j].id, this.leaderId, "ack", "replication");
            }
        }
        this.emitParticle(this.leaderId, "client", "commit", "client");
        this.lastOutcome = operation.outcome;
        this.flowItems = [
            "Client sends \"" + this.pendingValue + "\" to " + leader.name + ".",
            leader.name + " appends the entry locally at index " + this.commitIndex + ".",
            healthyFollowers > 0
                ? "Followers acknowledge the entry and quorum is satisfied."
                : "Leader has no follower acknowledgements, so this would be unsafe in a real cluster.",
            "The cluster advances commit index to " + this.commitIndex + " and the register reflects the committed result.",
        ];
        this.explainerHeading = "The command is committed because a majority acknowledged it.";
        this.explainerText = healthyFollowers > 0
            ? operation.detail + " This is the core Raft write path: leader append, follower acknowledgements, then a safe commit visible to the cluster."
            : "A leader-only append is not enough for a safe commit in a real Raft cluster. Majority acknowledgement is the part that matters.";
        this.focusCluster(
            this.nodes
                .filter(function (node) {
                    return node.kind === "raft" && (!node.isolated || node.id === this.leaderId);
                }, this)
                .map(function (node) {
                    return node.id;
                })
                .concat(["client"])
        );
        this.render();
    };

    Demo.prototype.partition = function () {
        if (this.partitioned) {
            return;
        }
        this.currentScenario = "partition";
        this.failedLeaderId = null;
        var node = this.nodeById("node-c");
        node.isolated = true;
        this.partitioned = true;
        this.pushTimeline("Follower partition");
        this.lastOutcome = "node-c is isolated; quorum remains available";
        this.flowItems = [
            "Network connectivity to node-c is cut.",
            "The other two nodes still form a majority.",
            "The leader can continue committing entries with quorum.",
            "node-c will need to catch up after recovery.",
        ];
        this.explainerHeading = "One follower is gone, but the cluster still has quorum.";
        this.explainerText =
            "Raft tolerates follower loss as long as a majority remains. Reads and writes can continue through the leader and the remaining follower.";
        this.pushLog("Network", "node-c is partitioned from the rest of the cluster.");
        this.focusCluster(["node-a", "node-b", "node-c"]);
        this.render();
    };

    Demo.prototype.recover = function () {
        this.currentScenario = "recovery";
        this.failedLeaderId = null;
        var node = this.nodeById("node-c");
        node.isolated = false;
        node.logIndex = this.commitIndex;
        this.partitioned = false;
        this.pushTimeline("Follower recovered");
        this.emitParticle(this.leaderId, "node-c", "catch-up", "recovery");
        this.lastOutcome = "node-c caught up to commit index " + this.commitIndex;
        this.flowItems = [
            "node-c reconnects to the leader and healthy follower.",
            "The leader sends any missing log entries or snapshots.",
            "node-c applies the missing state and reaches commit index " + this.commitIndex + ".",
            "All three nodes are healthy again.",
        ];
        this.explainerHeading = "The recovered follower catches up and rejoins the healthy majority.";
        this.explainerText =
            "Recovery is not just reconnecting the node. The lagging follower must receive missing entries or snapshots until its committed state matches the cluster.";
        this.pushLog("Recover", "node-c reconnects and catches up to commit index " + this.commitIndex + ".");
        this.focusCluster(["node-c", this.leaderId]);
        this.render();
    };

    Demo.prototype.reset = function () {
        this.clearTourTimer();
        this.term = 1;
        this.commitIndex = 1;
        this.leaderId = "node-b";
        this.partitioned = false;
        this.pendingValue = "set value=42";
        this.queryPolicy = "LINEARIZABLE";
        this.requireMinCommitIndex = false;
        this.currentScenario = "none";
        this.currentValue = "empty";
        this.stateByCommitIndex = { 1: "empty" };
        this.commandHistory = [];
        this.failedLeaderId = null;
        this.logItems = [];
        this.timelineItems = [];
        this.flowItems = [];
        this.tourAutoplay = false;
        this.lastOutcome = "Ready to replicate";
        this.syncCommandCopy();
        for (var i = 0; i < this.nodes.length; i += 1) {
            this.nodes[i].isolated = false;
            if (this.nodes[i].kind === "raft") {
                this.nodes[i].role = this.nodes[i].id === "node-d" ? "Learner" : this.nodes[i].id === "node-b" ? "Leader" : "Follower";
                this.nodes[i].active = this.nodes[i].id === "node-d" ? false : true;
                this.nodes[i].logIndex = this.nodes[i].id === "node-b" ? 1 : 0;
            }
        }
        this.seed();
        this.focusCluster(["node-a", "node-b", "node-c", "client"]);
        this.render();
    };

    Demo.prototype.runHappyPath = function () {
        if (this.partitioned) {
            this.recover();
        }
        this.currentScenario = "happy";
        this.setPendingCommand("set value=42", false);
        this.pushLog("Scenario", "Running the healthy write path.");
        this.replicate();
    };

    Demo.prototype.runPartitionScenario = function () {
        this.currentScenario = "partition";
        if (!this.partitioned) {
            this.partition();
        }
        this.setPendingCommand("compare-and-set value=42->84", false);
        this.pushLog("Scenario", "Leader keeps quorum and commits while node-c is isolated.");
        this.replicate();
    };

    Demo.prototype.runRecoveryScenario = function () {
        this.currentScenario = "recovery";
        if (!this.partitioned) {
            this.partition();
            this.setPendingCommand("compare-and-set value=42->84", false);
            this.replicate();
        }
        this.recover();
        this.pushLog("Scenario", "Recovered follower catches up to the leader's commit index.");
        this.render();
    };

    Demo.prototype.runSnapshotRecoveryScenario = function () {
        this.reset();
        this.currentScenario = "snapshotRecovery";
        this.partition();
        this.setPendingCommand("set value=42", false);
        this.replicate();
        this.setPendingCommand("compare-and-set value=42->84", false);
        this.replicate();
        this.setPendingCommand("set value=42", false);
        this.replicate();
        var laggingFollower = this.nodeById("node-c");
        if (laggingFollower) {
            laggingFollower.logIndex = 1;
        }
        this.pushTimeline("Snapshot installed");
        this.emitParticle(this.leaderId, "node-c", "snapshot", "recovery");
        if (laggingFollower) {
            laggingFollower.isolated = false;
            laggingFollower.logIndex = this.commitIndex;
        }
        this.partitioned = false;
        this.lastOutcome = "node-c caught up by installing a snapshot at commit index " + this.commitIndex;
        this.flowItems = [
            "node-c falls far enough behind that replaying every missing entry is no longer the only practical path.",
            "The leader prepares a snapshot boundary at the current committed state.",
            "node-c installs the snapshot and jumps directly to commit index " + this.commitIndex + ".",
            "After the snapshot, normal append entries can continue from the new baseline.",
        ];
        this.explainerHeading = "Snapshots shrink recovery time when a follower falls far behind.";
        this.explainerText =
            "This follows the configuration and log docs: snapshots cap replay cost and let lagging followers catch up from a compact state transfer instead of walking the entire missing log.";
        this.pushLog("Snapshot", "node-c installs a snapshot and resumes replication from the new baseline.");
        this.focusCluster([this.leaderId, "node-c"]);
        this.render();
    };

    Demo.prototype.runFailoverScenario = function () {
        this.reset();
        this.currentScenario = "failover";
        var oldLeader = this.nodeById("node-b");
        if (oldLeader) {
            oldLeader.isolated = true;
        }
        this.failedLeaderId = "node-b";
        this.term += 1;
        this.leaderId = "node-a";
        this.pushTimeline("Leader failover");
        this.emitParticle("node-c", this.leaderId, "vote", "election");
        this.lastOutcome = "node-b lost; " + this.leaderId + " became leader in term " + this.term;
        this.flowItems = [
            "The current leader disappears and stops participating.",
            "The remaining two raft nodes still form a majority.",
            this.leaderId + " wins the next election round in term " + this.term + ".",
            "Clients can continue writing through the new leader.",
        ];
        this.explainerHeading = this.leaderId + " takes over because the surviving majority can still elect a leader.";
        this.explainerText =
            "Raft tolerates leader loss as long as a majority can still communicate. The cluster enters a new term, elects a replacement leader, and continues safely.";
        this.pushLog("Failover", "node-b drops out and " + this.leaderId + " becomes the new leader.");
        this.focusCluster(["node-b", this.leaderId, "node-c"]);
        this.render();
    };

    Demo.prototype.runBackpressureScenario = function () {
        this.reset();
        this.currentScenario = "happy";
        this.setPendingCommand("set value=42", false);
        this.replicate();
        this.currentScenario = "backpressure";
        this.setPendingCommand("compare-and-set value=42->84", false);
        this.pushTimeline("Backpressure triggered");
        this.lastOutcome = "Leader rejected the new write under load";
        this.flowItems = [
            "The leader is still healthy and the cluster still has quorum.",
            "Too many writes are already pending in the leader's replication buffer.",
            "Instead of pretending it can buffer unbounded work, the leader rejects the new request.",
            "Clients should back off and retry rather than assume the write entered the Raft log.",
        ];
        this.explainerHeading = "Backpressure is an operational safety valve, not a quorum failure.";
        this.explainerText =
            "This matches the resiliency docs: under sustained load, MicroRaft can reject new requests temporarily instead of accepting more work than the leader can safely replicate.";
        this.pushLog("Load", 'Leader refuses "compare-and-set value=42->84" because the pending replication buffer is full.');
        this.commandHistory.unshift({
            index: "rejected",
            command: "compare-and-set value=42->84",
            detail: "Rejected before log append under high load.",
        });
        this.commandHistory = this.commandHistory.slice(0, 4);
        this.focusCluster([this.leaderId, "node-a", "node-c"]);
        this.render();
    };

    Demo.prototype.runLearnerScenario = function () {
        this.reset();
        this.currentScenario = "learner";
        this.commitIndex += 1;
        var learner = this.nodeById("node-d");
        if (learner) {
            learner.active = true;
            learner.role = "Learner";
            learner.logIndex = 0;
        }
        this.nodes.forEach(
            function (node) {
                if (this.isVotingRaftNode(node) && !node.isolated) {
                    node.logIndex = this.commitIndex;
                }
            }.bind(this)
        );
        this.stateByCommitIndex[this.commitIndex] = this.currentValue;
        this.pushTimeline("Learner added");
        this.lastOutcome = "node-d joined as a learner; quorum stayed 2-of-3 voters";
        this.flowItems = [
            "The leader commits a membership change that adds node-d as a learner.",
            "node-d starts receiving the current log, but it does not vote yet.",
            "Majority calculations still depend on the original three voting Raft nodes.",
            "Once node-d catches up, it can be promoted to follower in a second membership change.",
        ];
        this.explainerHeading = "Learners join safely because they do not increase quorum before they catch up.";
        this.explainerText =
            "This mirrors the membership-change guidance in the tutorial. Adding a learner avoids an availability dip while the new node is still catching up.";
        this.pushLog("Membership", "node-d joins the group as a learner and starts catching up from the leader.");
        this.emitParticle(this.leaderId, "node-d", "add", "recovery");
        this.focusCluster([this.leaderId, "node-d"]);
        this.render();
    };

    Demo.prototype.runPromoteLearnerScenario = function () {
        this.runLearnerScenario();
        var learner = this.nodeById("node-d");
        if (learner) {
            learner.logIndex = this.commitIndex;
            learner.role = "Follower";
        }
        this.currentScenario = "promotedLearner";
        this.commitIndex += 1;
        this.nodes.forEach(
            function (node) {
                if (this.isVotingRaftNode(node) && !node.isolated) {
                    node.logIndex = this.commitIndex;
                }
            }.bind(this)
        );
        this.stateByCommitIndex[this.commitIndex] = this.currentValue;
        this.pushTimeline("Learner promoted");
        this.lastOutcome = "node-d promoted to follower; quorum is now 3-of-4 voters";
        this.flowItems = [
            "node-d first catches up as a learner without affecting majority.",
            "A second membership change promotes node-d from learner to follower.",
            "The group now has four voting members, so safe majority requires three votes.",
            "Promotion increases fault-tolerant capacity only after the new node is ready.",
        ];
        this.explainerHeading = "Promotion is separate because readiness matters before quorum grows.";
        this.explainerText =
            "This matches the membership-change rules from the tutorial: add as learner first, then promote only after the new node has caught up enough to vote safely.";
        this.pushLog("Membership", "node-d is promoted from learner to follower once it reaches the current commit index.");
        this.emitParticle(this.leaderId, "node-d", "promote", "election");
        this.focusCluster([this.leaderId, "node-d", "node-a", "node-c"]);
        this.render();
    };

    Demo.prototype.runFourNodeQuorumScenario = function () {
        this.runPromoteLearnerScenario();
        var lostFollower = this.nodeById("node-c");
        if (lostFollower) {
            lostFollower.isolated = true;
        }
        this.partitioned = true;
        this.currentScenario = "fourNodeQuorum";
        this.setPendingCommand("compare-and-set value=42->84", false);
        this.pushLog("Scenario", "One follower drops after promotion, but the remaining 3-of-4 voters still commit.");
        this.replicate();
        this.lastOutcome = "3-of-4 voting quorum committed after one follower loss";
        this.flowItems = [
            "After promotion, node-c drops out and three voting nodes remain connected.",
            "The leader replicates the next entry to node-a and node-d.",
            "All three remaining voting nodes acknowledge, which exactly satisfies 3-of-4 quorum.",
            "The cluster still commits safely, but it no longer has spare voting capacity.",
        ];
        this.explainerHeading = "Promotion increases quorum size, so the cluster now needs three voting nodes to keep committing.";
        this.explainerText =
            "This is the operational tradeoff after learner promotion: capacity grows, but the majority threshold also rises. Losing one follower is still fine only because the other three voting nodes remain healthy.";
        this.focusCluster([this.leaderId, "node-a", "node-c", "node-d"]);
        this.render();
    };

    Demo.prototype.flashOutcomeCard = function () {
        var card = this.outcomeCard;
        if (!card) {
            return;
        }

        card.classList.remove("is-flash");
        void card.offsetWidth;
        card.classList.add("is-flash");
        window.setTimeout(function () {
            card.classList.remove("is-flash");
        }, 700);
    };

    Demo.prototype.renderStateMachine = function () {
        text(this.registerValue, this.currentValue);
        this.renderList(this.commandHistoryList, this.commandHistory, function (entry) {
            var item = document.createElement("li");
            var index = document.createElement("strong");
            index.textContent = "#" + entry.index;
            var command = document.createElement("span");
            command.className = "mr-demo-command-history-command";
            command.textContent = entry.command;
            var detail = document.createElement("span");
            detail.className = "mr-demo-command-history-detail";
            detail.textContent = entry.detail;
            item.appendChild(index);
            item.appendChild(command);
            item.appendChild(detail);
            return item;
        });
    };

    Demo.prototype.currentScenarioLabel = function () {
        switch (this.currentScenario) {
            case "happy":
                return "Healthy write";
            case "partition":
                return "Follower loss";
            case "recovery":
                return "Recovery";
            case "snapshotRecovery":
                return "Snapshot catch-up";
            case "failover":
                return "Leader failover";
            case "backpressure":
                return "Backpressure";
            case "learner":
                return "Add learner";
            case "promotedLearner":
                return "Promote learner";
            case "fourNodeQuorum":
                return "3-of-4 quorum";
            default:
                return "Manual exploration";
        }
    };

    Demo.prototype.renderReport = function () {
        if (!this.reportRoot) {
            return;
        }

        var available = this.availableCount();
        var totalVoting = this.totalVotingCount();
        var majority = this.majorityThreshold();
        var status = available >= majority ? (available === totalVoting ? "Healthy quorum" : "Degraded quorum") : "Quorum lost";
        var votingMembers = this.nodes
            .filter(function (node) {
                return node.kind === "raft" && node.role !== "Learner" && node.active !== false;
            })
            .map(function (node) {
                var suffix = node.id === this.failedLeaderId ? " (down)" : node.isolated ? " (isolated)" : "";
                return node.name + suffix;
            }, this)
            .join(", ");
        var learners = this.nodes
            .filter(function (node) {
                return node.kind === "raft" && node.role === "Learner" && node.active !== false;
            })
            .map(function (node) {
                return node.name + (node.logIndex < this.commitIndex ? " (catching up)" : "");
            }, this)
            .join(", ");
        var rows = [
            ["Term", String(this.term)],
            ["Leader", this.leaderId],
            ["Commit index", String(this.commitIndex)],
            ["Majority", majority + " of " + totalVoting + " voting nodes"],
            ["Health", status],
            ["Voting members", votingMembers || "none"],
            ["Learners", learners || "none"],
            ["Scenario", this.currentScenarioLabel()],
        ];

        this.renderList(this.reportRoot, rows, function (entry) {
            var row = document.createElement("div");
            var term = document.createElement("dt");
            var value = document.createElement("dd");
            row.className = "mr-demo-report-row";
            term.textContent = entry[0];
            value.textContent = entry[1];
            row.appendChild(term);
            row.appendChild(value);
            return row;
        });
    };

    Demo.prototype.render = function () {
        for (var i = 0; i < this.nodes.length; i += 1) {
            var node = this.nodes[i];
            var card = byId(node.id);
            card.className = "mr-node";
            if (node.active === false) {
                card.className += " is-hidden";
                continue;
            }
            if (node.kind === "client") {
                card.className += " is-client";
            } else if (node.role === "Learner") {
                card.className += " is-learner";
            } else {
                card.className += " " + (node.id === this.leaderId ? "is-leader" : "is-follower");
            }
            if (node.isolated) {
                card.className += " is-isolated";
            }
            if (node.id === this.failedLeaderId) {
                card.className += " is-failed";
            }
            text(card.querySelector(".mr-node-title"), node.name);
            text(
                card.querySelector(".mr-node-role"),
                node.kind === "client"
                    ? "Client"
                    : node.id === this.failedLeaderId
                      ? "Down"
                      : node.role === "Learner"
                        ? "Learner"
                        : node.id === this.leaderId
                          ? "Leader"
                          : "Follower"
            );
            text(
                card.querySelector(".mr-node-log"),
                node.kind === "client"
                    ? "sends commands and reads"
                    : "commit index " +
                          node.logIndex +
                          (node.id === this.failedLeaderId
                              ? " • unavailable"
                              : node.role === "Learner"
                                ? node.logIndex < this.commitIndex
                                    ? " • catching up"
                                    : " • non-voting"
                                : node.isolated
                                  ? " • isolated"
                                  : "")
            );
        }

        text(this.termValue, String(this.term));
        text(this.leaderValue, this.leaderId);
        text(this.commitValue, String(this.commitIndex));
        text(this.commandView, this.pendingValue);
        this.renderQuorum();
        this.renderStateSummary();
        this.renderNextAction();
        this.renderControlStates();
        this.renderStateMachine();
        this.renderReport();
        text(this.outcomeView, this.lastOutcome);
        if (this.lastRenderedOutcome !== this.lastOutcome) {
            this.flashOutcomeCard();
            this.lastRenderedOutcome = this.lastOutcome;
        }
        text(this.explainerTitle, this.explainerHeading);
        text(this.explainerBody, this.explainerText);
        this.renderTour();
        this.renderScenarioStatus();

        this.renderList(this.logList, this.logItems, function (entry) {
            var item = document.createElement("li");
            var tag = document.createElement("span");
            tag.className = "mr-log-tag";
            tag.textContent = entry.tag;
            item.appendChild(tag);
            item.appendChild(document.createTextNode(entry.message));
            return item;
        });

        this.renderList(this.timelineList, this.timelineItems, function (entry) {
            var timelineItem = document.createElement("li");
            var time = document.createElement("strong");
            time.textContent = entry.time;
            timelineItem.appendChild(time);
            timelineItem.appendChild(document.createTextNode(" " + entry.label));
            return timelineItem;
        });

        this.renderList(this.flowList, this.flowItems, function (entry) {
            var flowItem = document.createElement("li");
            flowItem.textContent = entry;
            return flowItem;
        });

        this.positionNodes();
        this.renderLinks();
    };

    Demo.prototype.availableCount = function () {
        var count = 0;
        for (var i = 0; i < this.nodes.length; i += 1) {
            if (this.isVotingRaftNode(this.nodes[i]) && !this.nodes[i].isolated) {
                count += 1;
            }
        }
        return count;
    };

    Demo.prototype.renderQuorum = function () {
        var available = this.availableCount();
        var totalVoting = this.totalVotingCount();
        var majority = this.majorityThreshold();
        var learners = this.activeLearnerCount();
        var status = "Healthy quorum";
        var className = "mr-quorum-badge is-healthy";
        var detail = available + "/" + totalVoting + " voting nodes available";

        if (available >= majority && available < totalVoting) {
            status = "Majority intact";
            className = "mr-quorum-badge is-degraded";
            detail += " • quorum still holds with " + majority + " votes";
        } else if (available < majority) {
            status = "No quorum";
            className = "mr-quorum-badge is-lost";
            detail += " • writes are unsafe until recovery";
        } else {
            detail += " • majority requires " + majority + " votes";
        }

        if (this.quorumBadge) {
            this.quorumBadge.className = className;
            text(this.quorumBadge, status);
        }
        if (learners > 0) {
            detail += " • +" + learners + " learner" + (learners > 1 ? "s" : "") + " catching up outside quorum";
        }
        text(this.quorumView, detail);
    };

    Demo.prototype.emitParticle = function (fromId, toId, label, type) {
        var from = byId(fromId);
        var to = byId(toId);
        if (!from || !to || !this.particleLayer) {
            return;
        }
        var clusterRect = this.cluster.getBoundingClientRect();
        var fromRect = from.getBoundingClientRect();
        var toRect = to.getBoundingClientRect();
        var particle = document.createElement("div");
        particle.className = "mr-particle is-" + type;
        particle.textContent = label;
        particle.style.left = fromRect.left + fromRect.width / 2 - clusterRect.left + "px";
        particle.style.top = fromRect.top + fromRect.height / 2 - clusterRect.top + "px";
        particle.style.setProperty("--mr-dx", toRect.left - fromRect.left + "px");
        particle.style.setProperty("--mr-dy", toRect.top - fromRect.top + "px");
        this.particleLayer.appendChild(particle);
        window.setTimeout(function () {
            particle.remove();
        }, 2800);
    };

    Demo.prototype.renderLinks = function () {
        var clusterRect = this.cluster.getBoundingClientRect();
        for (var i = 0; i < this.lines.length; i += 1) {
            var line = this.lines[i];
            var from = byId(line.getAttribute("data-from"));
            var to = byId(line.getAttribute("data-to"));
            var fromRect = from.getBoundingClientRect();
            var toRect = to.getBoundingClientRect();
            var fromNode = this.nodeById(line.getAttribute("data-from"));
            var toNode = this.nodeById(line.getAttribute("data-to"));

            if ((fromNode && fromNode.active === false) || (toNode && toNode.active === false)) {
                line.setAttribute("class", "mr-link is-hidden");
                continue;
            }

            line.setAttribute("x1", String(fromRect.left + fromRect.width / 2 - clusterRect.left));
            line.setAttribute("y1", String(fromRect.top + fromRect.height / 2 - clusterRect.top));
            line.setAttribute("x2", String(toRect.left + toRect.width / 2 - clusterRect.left));
            line.setAttribute("y2", String(toRect.top + toRect.height / 2 - clusterRect.top));

            var className = "mr-link";
            if (fromNode.isolated || toNode.isolated) {
                className += " is-cut";
            } else if (fromNode.id === this.leaderId || toNode.id === this.leaderId) {
                className += " is-active";
            }
            line.setAttribute("class", className);
        }
    };

    function HomeTabs() {
        this.root = bySelector("[data-mr-tabs]");
        if (!this.root) {
            return;
        }

        this.buttons = bySelectorAll("[data-tab-target]", this.root);
        this.panels = bySelectorAll("[data-tab-panel]", this.root);
        this.bind();
    }

    HomeTabs.prototype.bind = function () {
        var self = this;
        this.buttons.forEach(function (button) {
            button.addEventListener("click", function () {
                self.activate(button.getAttribute("data-tab-target"));
            });
        });
    };

    HomeTabs.prototype.activate = function (target) {
        this.buttons.forEach(function (button) {
            var isActive = button.getAttribute("data-tab-target") === target;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", isActive ? "true" : "false");
        });

        this.panels.forEach(function (panel) {
            var isActive = panel.getAttribute("data-tab-panel") === target;
            panel.classList.toggle("is-active", isActive);
            panel.hidden = !isActive;
        });
    };

    document.addEventListener("DOMContentLoaded", function () {
        new SiteLayout();
        new NavEnhancements();
        new ReadingEnhancements();
        new Demo();
        new HomeTabs();
    });
})();
