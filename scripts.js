let svg, xScale, yScale, colorScale, allData, filteredData;
let currentSelection = null;
let currentKeywordSelection = null;
let currentCategorySelection = null; // Track current category filter selection
let currentSelectedKeyword = null; // Track the currently selected keyword string
let legendExpanded = {};
let nodeMap = new Map(); // OPTIMIZATION: Fast O(1) node lookup by ID
let keywordIndex = new Map(); // OPTIMIZATION: Fast keyword-to-nodes lookup
// activeGroupDropdown removed - no longer using SVG dropdowns

// Timeline player variables
let timelinePlayer = {
    isPlaying: false,
    currentTime: 0, // 0 to 1, representing position on timeline
    animationSpeed: 0.00005, // Speed of timeline progression (much slower)
    animationFrame: null,
    startDate: null,
    endDate: null,
    currentDate: null,
    autoplay: true, // Auto-start the animation
    loop: true, // Auto-loop when reaching the end
    idleTimer: null, // Timer for idle detection
    lastActivity: Date.now() // Track last user activity
};

// Idle detection functions
function resetIdleTimer() {
    timelinePlayer.lastActivity = Date.now();

    // Clear existing timer
    if (timelinePlayer.idleTimer) {
        clearTimeout(timelinePlayer.idleTimer);
    }

    // Set new timer for 60 seconds (60000ms)
    timelinePlayer.idleTimer = setTimeout(() => {
        console.log('🕐 Application idle for 1+ minutes - starting auto-play');
        if (!timelinePlayer.isPlaying) {
            playTimeline();
        }
    }, 60000);
}

function trackActivity() {
    resetIdleTimer();
}

// Parse UK date function - moved to global scope
function parseUKDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;

    const cleaned = dateString.trim().toLowerCase();

    if (cleaned === 'unknown' || cleaned === '' || cleaned === 'n/a' ||
        cleaned === 'na' || cleaned === 'null' || cleaned === 'undefined') {
        return 'unknown';
    }

    // Try yyyy-mm-dd format first (ISO 8601)
    const isoDatePattern = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
    const isoMatch = cleaned.match(isoDatePattern);

    if (isoMatch) {
        const year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10);
        const day = parseInt(isoMatch[3], 10);

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2030) {
            const date = new Date(year, month - 1, day);

            if (date.getFullYear() === year &&
                date.getMonth() === month - 1 &&
                date.getDate() === day) {
                return date;
            }
        }
    }

    // Fall back to UK date format (dd/mm/yyyy or dd-mm-yyyy)
    const ukDatePattern = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const match = cleaned.match(ukDatePattern);

    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2030) {
            const date = new Date(year, month - 1, day);

            if (date.getFullYear() === year &&
                date.getMonth() === month - 1 &&
                date.getDate() === day) {
                return date;
            }
        }
    }

    return null;
}

// SVG dropdown functions removed - now using HTML dropdowns

const type1GroupMap = {
    'Arts': 'Entertainment',
    'Theatre': 'Entertainment',
    'Comedy': 'Entertainment',
    'Film and Cinema': 'Entertainment',
    'Festival': 'Entertainment',
    'Music': 'Entertainment',
    'Culture': 'Entertainment',

    'Government': 'Government',
    'Local Authority': 'Government',
    'Parliament': 'Government',
    'Executive NDPB': 'Government',
    'Agency': 'Government',
    'Public Corporations': 'Government',
    'Politics': 'Government',
    'Law': 'Government',
    'Support': 'Government',
    'Utilities': 'Government',
    'Transport': 'Government',
    'Community': 'Government',

    'Health': 'Education',
    'Health and Social Care': 'Education',
    'Education': 'Education',
    'School': 'Education',
    'School, Primary': 'Education',
    'School, Secondary': 'Education',
    'School, ASL': 'Education',
    'School, Independent': 'Education',
    'Libraries and Archives': 'Education',
    'Research': 'Education',
    'Science': 'Education',
    'Think Tank': 'Education',
    'History': 'Education',
    'Heritage': 'Education',

    'Sports': 'Media',
    'News': 'Media',
    'Media': 'Media',
    'Blog': 'Media',
    'Heritage and Tourism': 'Media'
};

const groupOrder = [
    'Media',
    'Entertainment',
    'Education',
    'Government'
];

const SCREEN_ASPECT_RATIO = 64 / 44;

document.addEventListener('DOMContentLoaded', function () {
    // Allow normal scrolling behavior

    // HTML dropdowns will be initialized after data is loaded

    // Touch event handling simplified - only prevent on visualization elements
    document.addEventListener('touchstart', function (e) {
        if (e.target.closest('svg') || e.target.classList.contains('node')) {
            // Allow touch events on visualization elements
            return;
        }
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
        if (e.target.closest('svg') || e.target.classList.contains('node')) {
            // Allow touch events on visualization elements
            return;
        }
    }, { passive: true });

    const container = d3.select('.svg-container');

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isPortrait = viewportHeight > viewportWidth;

    const SCREEN_ASPECT_RATIO = 64 / 44;

    let width, height;

    // With 100% width SVG, we calculate based on viewport dimensions
    if (isPortrait) {
        // For portrait, use most of the available height and full width
        width = viewportWidth; // Use full viewport width
        height = viewportHeight * 0.95; // Use 95% of viewport height (increased from 90%)
    } else {
        // For landscape, use most of the available height and full width
        height = viewportHeight * 0.95; // Use 95% of viewport height (increased from 90%)
        width = viewportWidth; // Use full viewport width
    }

    const margin = {
        top: 0,
        right: isPortrait ? Math.max(width / 10, 40) : width / 6,
        bottom: 0,
        left: isPortrait ? 10 : 20
    };

    // With 100% width, we need to handle padding differently
    const actualWidth = width; // Use the full calculated width
    const actualHeight = height + 500; // Increased to accommodate more data (was 300)

    svg = container.append('svg')
        .attr('width', '100%')
        .attr('height', actualHeight)
        .attr('viewBox', `0 0 ${actualWidth} ${actualHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet') // Maintain aspect ratio and center
        .style('background', '#000000')
        .style('margin', '0 auto')
        .style('display', 'block')
        .style('overflow', 'visible');

    window.debugVisualization = function () {
        console.log('Visualization Debug:');
        console.log('SVG exists:', !!svg);
        console.log('SVG node:', svg ? svg.node() : 'null');
        console.log('Click handler:', svg ? svg.on('click') : 'null');
        console.log('Label containers: 0 (using HTML dropdowns)');
        console.log('Active dropdown: none (using HTML dropdowns)');
        console.log('Current dimensions:', {
            width: svg ? svg.attr('width') : 'unknown',
            height: svg ? svg.attr('height') : 'unknown',
            viewBox: svg ? svg.attr('viewBox') : 'unknown'
        });

        if (svg) {
            console.log('Testing click event...');
            svg.dispatch('click');
        }
    };

    const categoryPanel = svg.append('g')
        .attr('class', 'category-panel')
        .attr('transform', `translate(${margin.left - (isPortrait ? 10 : 20)}, ${margin.top + 40})`);

    const loadingText = svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('class', 'status-message')
        .text("Loading data...");

    loadData();

    // Scroll setup removed - no longer needed for responsive design

    function loadData() {
        d3.csv('final_covid_data.csv').then(function (rawData) {
            processData(rawData);
        }).catch(function (error) {
            console.error("Error loading data:", error);
            console.log("Using sample data for demonstration");
            const sampleData = generateSampleData();
            processData(sampleData);
        });
    }

    function generateSampleData() {
        const type1Categories = Object.keys(type1GroupMap);
        const keywords = ['pandemic', 'vaccine', 'lockdown', 'symptoms', 'treatment', 'prevention', 'outbreak', 'immunity'];
        const sampleData = [];

        for (let i = 0; i < 300; i++) {
            const randomDate = new Date(2020, Math.floor(Math.random() * 24), Math.floor(Math.random() * 28) + 1);
            const randomKeywords = keywords.filter(() => Math.random() > 0.6).join(', ');
            const randomType1 = type1Categories[Math.floor(Math.random() * type1Categories.length)];

            sampleData.push({
                id: i + 1,
                title: `Corona Article ${i + 1}`,
                url: `https://example.com/article${i + 1}`,
                'first_date_parsed': randomDate.toISOString().split('T')[0],
                type1: randomType1,
                type2: 'coronavirus',
                is_alive: Math.random() > 0.3,
                summary: `This is a summary of coronavirus article ${i + 1}`,
                keywords: randomKeywords,
                'full text': `Full text content for article ${i + 1}`
            });
        }
        return sampleData;
    }


    // OPTIMIZATION: Build fast lookup indices for O(1) access
    function buildDataIndices() {
        console.log('Building data indices for fast lookup...');
        const startTime = performance.now();

        // Clear existing indices
        nodeMap.clear();
        keywordIndex.clear();

        // Build node lookup map (id -> node)
        filteredData.forEach(node => {
            nodeMap.set(node.id, node);

            // Build keyword index (keyword -> array of nodes)
            if (node.keywords && node.keywords.length > 0) {
                node.keywords.forEach(keyword => {
                    if (!keywordIndex.has(keyword)) {
                        keywordIndex.set(keyword, []);
                    }
                    keywordIndex.get(keyword).push(node);
                });
            }
        });

        const endTime = performance.now();
        console.log(`✅ Built indices for ${filteredData.length} nodes, ${keywordIndex.size} unique keywords in ${(endTime - startTime).toFixed(2)}ms`);
    }

    function processData(rawData) {
        svg.select('.status-message').remove();

        console.log('Raw data sample:', rawData.slice(0, 3));
        console.log('Total records:', rawData.length);

        // Data is already filtered and preprocessed by preprocess_data.py
        // Just parse dates and prepare for visualization
        rawData.forEach((d, index) => {
            const dateString = d['first_date_parsed'];
            const parsedDate = parseUKDate(dateString);

            // Parse date (should be valid since preprocessed)
            d.parsedDate = parsedDate || new Date();
            d.isGeneratedDate = false;

            // Store the original date strings for timeline functionality
            d.firstDateParsed = d['first_date_parsed'];
            d.lastDateParsed = d['last_date_parsed'];

            // Ensure ID is correct type
            if (!d.id || d.id === 'missing' || d.id === '') {
                d.id = `gen_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            } else if (!isNaN(+d.id)) {
                d.id = +d.id;
            }

            // Use first_keywords_auto field
            d.keywords = d.first_keywords_auto ? d.first_keywords_auto.split(',').map(k => k.trim()).filter(k => k.length > 0) : [];

            // Group is already set by preprocessing script, but fallback if missing
            if (!d.group) {
                d.group = type1GroupMap[d.type1] || 'Other';
            }
        });

        filteredData = rawData;
        console.log('Processed data:', filteredData);
        allData = filteredData;

        // OPTIMIZATION: Build fast lookup indices for large datasets
        buildDataIndices();

        if (filteredData.length === 0) {
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('class', 'status-message')
                .text("No data found")
                .attr('fill', 'red');
            return;
        }

        console.log(`Successfully loaded ${filteredData.length} records`);
        console.log('Date range:',
            d3.min(filteredData, d => d.parsedDate).toISOString().split('T')[0],
            'to',
            d3.max(filteredData, d => d.parsedDate).toISOString().split('T')[0]
        );

        setupScales();
        createVisualization();

        // Initialize HTML dropdowns after data is loaded
        initializeHTMLDropdowns();

        // Initialize timeline player after data is loaded
        initializeTimelinePlayer();
    }

    function setupScales() {
        const actualTimeExtent = d3.extent(filteredData, d => d.parsedDate);
        console.log('Actual data date range:',
            actualTimeExtent[0].toISOString().split('T')[0],
            'to',
            actualTimeExtent[1].toISOString().split('T')[0]
        );

        // Create a simple time scale that uses the full available height
        const startDate = actualTimeExtent[0];
        const endDate = actualTimeExtent[1];
        const availableHeight = height - margin.top - margin.bottom;

        console.log('Y axis will cover:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
        console.log('Available height for beeswarm:', availableHeight);

        // Create a density-aware time scale that spreads out dense periods
        console.log('Creating density-aware time scale...');

        // Count nodes per month to identify dense periods
        const monthCounts = {};
        filteredData.forEach(d => {
            const monthKey = `${d.parsedDate.getFullYear()}-${String(d.parsedDate.getMonth() + 1).padStart(2, '0')}`;
            monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
        });

        console.log('Node density by month:', monthCounts);

        // Create a custom Y positioning that starts at top and spreads dense periods
        const yStart = -500; // Start higher up (was -320)
        const yEnd = margin.top + availableHeight + 400; // End lower down (was -15)
        const totalHeight = yEnd - yStart;

        // Sort all data by date and assign sequential Y positions
        const sortedData = [...filteredData].sort((a, b) => a.parsedDate - b.parsedDate);

        // Assign Y positions with equal spacing
        sortedData.forEach((d, i) => {
            const ratio = i / (sortedData.length - 1);
            d.adjustedY = yStart + (ratio * totalHeight);
        });

        // Create a simple time scale for reference (not used for positioning)
        yScale = d3.scaleTime()
            .domain([startDate, endDate])
            .range([yStart, yEnd]);

        // Debug: Check the actual Y position distribution
        const yPositions = filteredData.map(d => d.adjustedY);
        const minY = Math.min(...yPositions);
        const maxY = Math.max(...yPositions);
        console.log('Y position range:', minY, 'to', maxY);
        console.log('Expected Y range:', margin.top + 20, 'to', margin.top + availableHeight);
        console.log('Data spans', ((maxY - minY) / availableHeight * 100).toFixed(1) + '% of available height');

        // With 100% width, use most of the available width for the visualization
        const availableWidth = width * 0.9; // Use 90% of the full width for better spacing
        const centerOffset = (width - availableWidth) / 2;
        const visualizationStart = centerOffset;

        xScale = d3.scalePoint()
            .domain(groupOrder)
            .range([visualizationStart, visualizationStart + availableWidth])
            .padding(0.2); // Reduced padding to make categories wider

        console.log('X Scale setup:', {
            domain: groupOrder,
            range: [visualizationStart, visualizationStart + availableWidth],
            positions: groupOrder.map(g => ({ group: g, x: xScale(g) }))
        });

        colorScale = d3.scaleOrdinal()
            .domain(groupOrder)
            .range([
                '#62BBB2', // Media
                '#5997F5', // Entertainment
                '#0055BC', // Knowledge
                '#345F4D'  // Government
            ]);

        setupDynamicSizesWithSqrt();
    }

    function createVisualization() {
        createAxes();
        createConnectionLines();
        createNodes();

        console.log('Setting up click events...');
        setupGlobalClickHandler();
        console.log('Click events ready!');
    }

    function createAxes() {
        console.log('Category labels now handled by HTML dropdowns');
        // SVG-based dropdowns have been removed in favor of HTML/CSS/JS dropdowns
    }

    function setupGlobalClickHandler() {
        svg.on('click', null);
        svg.on('touchend', null);

        svg.on('click', function (event) {
            trackActivity(); // Track user activity
            console.log('SVG global click - checking target...', event.target);

            const target = event.target;

            if (target.classList.contains('node') ||
                target.tagName === 'circle' ||
                target.closest('.group-category-dropdown') ||
                target.closest('.legend') ||
                target.closest('.category-panel') ||
                target.closest('.axis') ||
                target.closest('#timeline-player') ||
                target.closest('.play-button') ||
                target.closest('#play-pause-btn')) {
                console.log('Important element clicked - not resetting');
                return;
            }

            console.log('Empty area clicked - executing reset');
            resetVisualization();
        });

        svg.on('touchend', function (event) {
            trackActivity(); // Track user activity
            console.log('SVG global touch - checking target...');

            const target = event.target;

            if (target.classList.contains('node') ||
                target.tagName === 'circle' ||
                target.closest('.group-category-dropdown')) {
                console.log('Important element touched - not handling');
                return;
            }

            event.preventDefault();
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                clientX: event.changedTouches[0].clientX,
                clientY: event.changedTouches[0].clientY
            });
            event.target.dispatchEvent(clickEvent);
        });

        console.log('Global click handler setup complete');
    }

    window.testCategorySystem = function () {
        console.log('Testing category system...');
        console.log('HTML dropdowns are active - no SVG categories to test');
        console.log('Check the HTML dropdowns at the top of the page');
    };

    // SVG openDropdown function removed - now using HTML dropdowns

    function highlightType1(selectedType1) {
        console.log('highlightType1 called with:', selectedType1);
        const startTime = performance.now();

        if (!svg || !filteredData) {
            console.error('SVG or filteredData not available');
            return;
        }

        // Store the current selection
        currentCategorySelection = {
            type1: selectedType1,
            category: type1GroupMap[selectedType1]
        };

        // Show the selected tag
        showSelectedTag(selectedType1, type1GroupMap[selectedType1]);

        // Close the keyword panel if it's open
        const keywordPanel = document.getElementById('keyword-panel');
        if (keywordPanel) {
            keywordPanel.style.display = 'none';
            keywordPanel.innerHTML = '';
        }

        // Remove the panel-open class to center the visualization
        const visualizationContainer = document.getElementById('visualization-container');
        if (visualizationContainer) {
            visualizationContainer.classList.remove('panel-open');
        }

        svg.selectAll('.connection-line').remove();

        svg.selectAll('.node')
            .each(function (d) {
                const currentOpacity = parseFloat(d3.select(this).attr('opacity') || 0);
                if (currentOpacity > 0) {
                    // Only dim nodes that are currently visible
                    d3.select(this)
                        .attr('opacity', 0.1)
                        .attr('r', d.radius)
                        .style('filter', 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.2))');
                }
            });

        let targetTypes = [selectedType1];
        if (selectedType1 === 'Parliament') {
            targetTypes = ['Parliament', 'Scottish Government and Parliament'];
        }

        const allNodesWithType1 = filteredData.filter(d =>
            targetTypes.includes(d.type1)
        );

        // Filter to only include nodes that are currently visible
        const nodesWithType1 = allNodesWithType1.filter(node => {
            let isVisible = false;
            svg.selectAll('.node').each(function (nodeData) {
                if (nodeData.id === node.id) {
                    const opacity = parseFloat(d3.select(this).attr('opacity') || 0);
                    isVisible = opacity > 0;
                }
            });
            return isVisible;
        });

        console.log(`Found ${allNodesWithType1.length} total nodes with type1: ${selectedType1}, ${nodesWithType1.length} currently visible`);
        console.log('Target types:', targetTypes);

        if (nodesWithType1.length === 0) {
            console.warn('No nodes found with type1:', selectedType1);
            console.log('Available type1 values:', [...new Set(filteredData.map(d => d.type1))]);
            return;
        }

        // OPTIMIZATION: Use a Set for O(1) lookup instead of multiple filter operations
        const highlightedNodeIds = new Set(nodesWithType1.map(n => n.id));
        if (currentKeywordSelection) {
            highlightedNodeIds.add(currentKeywordSelection.id);
        }

        // OPTIMIZATION: Single pass through nodes instead of forEach with nested selectAll
        svg.selectAll('.node')
            .each(function (d) {
                if (highlightedNodeIds.has(d.id)) {
                    // Only highlight if the node is currently visible (opacity > 0)
                    const currentOpacity = parseFloat(d3.select(this).attr('opacity') || 0);
                    if (currentOpacity > 0) {
                        const isMainSelection = nodesWithType1.some(n => n.id === d.id);
                        d3.select(this)
                            .attr('opacity', 1)
                            .attr('r', isMainSelection ? d.radius * 1.2 : d.radius)
                            .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))');
                    }
                }
            });

        const endTime = performance.now();
        console.log(`✅ Highlighted ${nodesWithType1.length} nodes for type1: ${selectedType1} in ${(endTime - startTime).toFixed(2)}ms`);
    }

    function showSelectedTag(type1, category) {
        console.log('Showing selected tag:', type1, 'for category:', category);

        // Hide all selected tags first
        document.querySelectorAll('.selected-tag').forEach(tag => {
            tag.classList.remove('show');
        });

        // Show the selected tag for this category
        const selectedTag = document.querySelector(`.selected-tag[data-category="${category}"]`);
        if (selectedTag) {
            const textSpan = selectedTag.querySelector('.selected-tag-text');
            if (textSpan) {
                textSpan.textContent = type1;
            }
            selectedTag.classList.add('show');
        }
    }

    // Make functions globally accessible
    window.hideAllSelectedTags = function () {
        console.log('Hiding all selected tags');
        document.querySelectorAll('.selected-tag').forEach(tag => {
            tag.classList.remove('show');
        });
    };

    // Make highlightType1 globally accessible for debugging
    window.highlightType1 = highlightType1;

    // Debug function to check data availability
    window.debugData = function () {
        console.log('=== DEBUG DATA ===');
        console.log('SVG available:', !!svg);
        console.log('FilteredData available:', !!filteredData);
        console.log('FilteredData length:', filteredData ? filteredData.length : 'N/A');
        if (filteredData && filteredData.length > 0) {
            console.log('Sample node:', filteredData[0]);
            console.log('Available type1 values:', [...new Set(filteredData.map(d => d.type1))]);
            console.log('Type1GroupMap:', type1GroupMap);
        }
        console.log('================');
    };

    window.debugDropdown = function () {
        console.log('Debugging dropdown...');
        console.log('Using HTML dropdowns - check the dropdowns at the top of the page');
        if (filteredData) {
            console.log('Available type1 values:', [...new Set(filteredData.map(d => d.type1))]);
        }
    };

    function createNodes() {
        const groupedData = d3.group(filteredData, d => d.group);

        groupedData.forEach((groupData, groupName) => {
            const groupX = xScale(groupName);

            console.log(`Group ${groupName}: centerX=${groupX}`);

            const sortedData = groupData.sort((a, b) => a.parsedDate - b.parsedDate);

            sortedData.forEach((d, i) => {
                // Initialize positions at group center - clustering will handle positioning
                d.displayX = groupX;
                d.displayY = d.adjustedY;
                d.x = groupX;
                d.y = d.adjustedY;
            });
        });

        const nodes = svg.selectAll('.node')
            .data(filteredData)
            .enter()
            .append('circle')
            .attr('class', 'node')
            .attr('cx', d => {
                console.log(`Node ${d.id}: x=${d.displayX}, group=${d.group}`);
                return d.displayX;
            })
            .attr('cy', d => d.displayY)
            .attr('r', d => d.radius)
            .attr('fill', d => colorScale(d.group))
            .attr('opacity', 0.8)
            .attr('stroke', d => d.isGeneratedDate ? '#FFD700' : 'none')
            .attr('stroke-width', d => d.isGeneratedDate ? 1.5 : 0)
            .style('stroke-dasharray', d => d.isGeneratedDate ? '2,2' : 'none')
            .on('click', function (event, d) {
                console.log('Node click event:', d.id);
                event.preventDefault();
                event.stopPropagation();
                handleClick(event, d);
            })
            .on('touchstart', function (event, d) {
                console.log('Node touchstart:', d.id);
                event.preventDefault();
                event.stopPropagation();
                handleTouchStart(event, d);
            })
            .on('touchend', function (event, d) {
                console.log('Node touchend:', d.id);
                event.preventDefault();
                event.stopPropagation();
                handleTouchEnd(event, d);
            })
            .on('mousedown', handleMouseDown)
            .on('mouseup', handleMouseUp)
            .on('mouseleave', handleMouseUp);

        applyCollisionAvoidance(nodes);
    }

    // SVG showGroupCategoryDropdown function removed - now using HTML dropdowns

    function hideGroupCategoryDropdown() {
        // SVG dropdowns removed - function kept for compatibility
    }

    // Floating panel scroll behavior removed - panels will use fixed positioning

    // Force-directed beeswarm function
    function createBeeswarmForce() {
        let x = d => d.x0;
        let y = d => d.y0;
        let r = d => d.r;
        let ticks = 300;

        function beeswarm(data) {
            const entries = data.map(d => {
                return {
                    x0: typeof x === "function" ? x(d) : x,
                    y0: typeof y === "function" ? y(d) : y,
                    r: typeof r === "function" ? r(d) : r,
                    data: d
                };
            });

            const simulation = d3.forceSimulation(entries)
                .force("x", d3.forceX(d => d.x0))
                .force("y", d3.forceY(d => d.y0))
                .force("collide", d3.forceCollide(d => d.r));

            for (let i = 0; i < ticks; i++) simulation.tick();

            return entries;
        }

        beeswarm.x = f => f ? (x = f, beeswarm) : x;
        beeswarm.y = f => f ? (y = f, beeswarm) : y;
        beeswarm.r = f => f ? (r = f, beeswarm) : r;
        beeswarm.ticks = n => n ? (ticks = n, beeswarm) : ticks;

        return beeswarm;
    }

    function applyCollisionAvoidance(nodes) {
        console.log('🔥🔥🔥 Creating force-directed clustering around vertical lines...');
        console.log('🔥🔥🔥 Function called with', nodes.size(), 'nodes');
        const startTime = performance.now();

        // Debug: Check filteredData
        console.log('🔥🔥🔥 FilteredData length:', filteredData.length);
        if (filteredData.length > 0) {
            console.log('🔥🔥🔥 Sample data object:', filteredData[0]);
            console.log('🔥🔥🔥 Available groups:', [...new Set(filteredData.map(d => d.group))]);
        }

        // Group data by category for separate force simulations
        console.log('filteredData', filteredData);
        const groupedData = d3.group(filteredData, d => d.group);
        console.log('🔥🔥🔥 Grouped data (Map):', groupedData);
        console.log('🔥🔥🔥 Grouped data keys:', Array.from(groupedData.keys()));

        // Run force simulation for each group
        groupedData.forEach((groupData, groupName) => {
            console.log(`Running force simulation for ${groupName} (${groupData.length} nodes)`);

            const groupCenterX = xScale(groupName);

            // Give nodes initial random positions so forces can work
            groupData.forEach(node => {
                const initialX = groupCenterX + (Math.random() - 0.5) * 100; // Random horizontal offset
                const initialY = node.adjustedY + (Math.random() - 0.5) * 20; // Small random vertical offset
                node.x = initialX;
                node.y = initialY;
                console.log(`  Node ${node.id}: initial x=${initialX.toFixed(1)}, y=${initialY.toFixed(1)}`);
            });

            console.log(`${groupName}: Initial positions set with random offsets`);

            // Create force simulation for this group
            const simulation = d3.forceSimulation(groupData)
                .force('x', d3.forceX(groupCenterX).strength(0.1)) // Weak pull toward group center
                .force('y', d3.forceY(d => d.adjustedY).strength(0.2)) // Weak hold on Y position - allows clustering
                .force('collide', d3.forceCollide().radius(d => d.radius + 8).strength(1.0)) // Strong collision avoidance
                .stop();

            // Run simulation for many ticks to allow natural clustering
            for (let i = 0; i < 200; ++i) {
                simulation.tick();
            }

            // Log final positions to see if simulation worked
            groupData.forEach(node => {
                console.log(`  Node ${node.id}: final x=${node.x.toFixed(1)}, y=${node.y.toFixed(1)}`);
            });

            console.log(`${groupName}: Force simulation complete - nodes should now cluster around vertical line`);
        });

        // Update data with final positions
        filteredData.forEach(d => {
            d.displayX = d.x;
            d.displayY = d.y;
        });

        // Update node positions
        nodes.attr('cx', d => d.displayX)
            .attr('cy', d => d.displayY);

        const endTime = performance.now();
        console.log(`✅ Force-directed clustering complete in ${(endTime - startTime).toFixed(2)}ms`);
    }

    function createConnectionLines() {
        // OPTIMIZATION: Don't pre-compute connection lines for large datasets
        // Connection lines will be drawn on-demand when a keyword is selected
        const connectionLinesGroup = svg.append('g')
            .attr('class', 'connection-lines');

        console.log('Connection lines group created - lines will be drawn on-demand for performance');
    }

    function setupDynamicSizesWithSqrt() {
        const keywordExtent = d3.extent(filteredData, d => d.keywords.length);

        const sizeScale = d3.scaleSqrt()
            .domain(keywordExtent)
            .range([12, 12]); // Increased from [3, 5] to [6, 12] for much larger dots

        filteredData.forEach(d => {
            d.radius = sizeScale(d.keywords.length);
        });
    }

    function createLegend() {
        return;
    }

    function handleTouchStart(event, d) {
        console.log('Touch start:', d.id);
        window.lastNodeInteraction = Date.now();

        event.preventDefault();
    }

    function handleTouchEnd(event, d) {
        console.log('Touch end:', d.id);
        window.lastNodeInteraction = Date.now();

        event.preventDefault();

        console.log('Touch detected, triggering click');
        handleClick(event, d);
    }

    console.log('Event bubbling fixes applied!');

    function handleMouseDown(event, d) {
        // No longer needed - all clicks behave the same
    }

    function handleMouseUp(event, d) {
        // No longer needed - all clicks behave the same
    }

    function handleClick(event, d) {
        console.log('handleClick called for node:', d.id, 'event type:', event.type);

        // Auto-pause timeline when node is clicked
        if (timelinePlayer.isPlaying) {
            pauseTimeline();
            console.log('⏸️ Timeline auto-paused due to node click');
        }

        // SVG dropdowns removed - no need to close them
        currentSelection = d;
        currentKeywordSelection = d;

        // Use the long press behavior for all clicks
        svg.selectAll('.connection-line').remove();

        svg.selectAll('.click-indicator, .long-press-indicator').remove();

        // Interrupt any ongoing transitions and dim all visible nodes
        svg.selectAll('.node')
            .interrupt() // Stop any ongoing transitions
            .each(function (nodeData) {
                const currentOpacity = parseFloat(d3.select(this).attr('opacity') || 0);
                if (currentOpacity > 0) {
                    // Only dim nodes that are currently visible
                    d3.select(this)
                        .attr('opacity', 0.1)
                        .attr('r', nodeData.radius)
                        .style('filter', 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.2))');
                }
            });

        const targetElement = event.target;
        // Use the data's current position instead of DOM attributes for accuracy
        const nodeX = d.displayX || parseFloat(targetElement.getAttribute('cx'));
        const nodeY = d.displayY || parseFloat(targetElement.getAttribute('cy'));
        const nodeRadius = d.radius || parseFloat(targetElement.getAttribute('r'));

        const offsetX = 0;
        const offsetY = 0; // Center the indicator on the node
        const circleRadius = nodeRadius + 8; // Slightly larger buffer for the larger dots

        const circleX = nodeX + offsetX;
        const circleY = nodeY + offsetY;

        const rotatingCircle = svg.append('circle')
            .attr('class', 'long-press-indicator')
            .attr('cx', circleX)
            .attr('cy', circleY)
            .attr('r', circleRadius)
            .attr('fill', 'none')
            .attr('stroke', colorScale(d.group))
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,3')
            .attr('opacity', 0.8);

        rotatingCircle
            .append('animateTransform')
            .attr('attributeName', 'transform')
            .attr('attributeType', 'XML')
            .attr('type', 'rotate')
            .attr('from', `0 ${circleX} ${circleY}`)
            .attr('to', `360 ${circleX} ${circleY}`)
            .attr('dur', '6s')
            .attr('repeatCount', 'indefinite');

        // Highlight current selected node (interrupt any transitions first)
        d3.select(targetElement)
            .interrupt() // Stop any ongoing transitions
            .attr('opacity', 1)
            .attr('r', d.radius)
            .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))')
            .raise();

        // OPTIMIZATION: Handle related nodes highlighting using keywordIndex
        const relatedNodeIds = new Set();
        d.keywords.forEach(keyword => {
            const nodesWithKeyword = keywordIndex.get(keyword) || [];
            nodesWithKeyword.forEach(node => {
                if (node.id !== d.id) {
                    // Only add nodes that are currently visible (not at opacity 0)
                    const nodeElement = svg.select(`.node[data-id="${node.id}"]`);
                    if (nodeElement.empty()) {
                        // Try to find by checking all nodes
                        svg.selectAll('.node').each(function (nodeData) {
                            if (nodeData.id === node.id) {
                                const currentOpacity = parseFloat(d3.select(this).attr('opacity') || 0);
                                if (currentOpacity > 0) {
                                    relatedNodeIds.add(node.id);
                                }
                            }
                        });
                    }
                }
            });
        });

        // OPTIMIZATION: Single pass through nodes instead of forEach with nested selectAll
        if (relatedNodeIds.size > 0) {
            svg.selectAll('.node')
                .each(function (nodeData) {
                    if (relatedNodeIds.has(nodeData.id)) {
                        const currentOpacity = parseFloat(d3.select(this).attr('opacity') || 0);
                        if (currentOpacity > 0) { // Only highlight if node is visible
                            d3.select(this)
                                .interrupt() // Stop any ongoing transitions
                                .attr('opacity', 1)
                                .attr('r', nodeData.radius)
                                .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))')
                                .raise();
                        }
                    }
                });
        }

        showKeywordSelection(d.keywords);
    }



    function showKeywordSelection(keywords) {
        console.log('🔗 showKeywordSelection called with', keywords.length, 'keywords');

        const panel = document.getElementById('keyword-panel');
        if (!panel) {
            console.error('❌ keyword-panel element not found!');
            return;
        }

        panel.style.display = 'block';

        // Add class to slide visualization to the left
        const visualizationContainer = document.getElementById('visualization-container');
        if (visualizationContainer) {
            visualizationContainer.classList.add('panel-open');
        }

        if (keywords.length === 0) {
            panel.innerHTML = '<h3>Keywords:</h3><p style="color: #666;">No keywords available</p>';
            return;
        }

        // Get the current selection data for article info
        const articleData = currentSelection || currentKeywordSelection;

        // 🔗 竖向辐射设计 - 窄而高
        panel.style.width = '555px';  // Corrected width
        panel.style.height = '791px';  // Set panel height
        const keywordWidth = 555;
        const keywordHeight = 500;  // Updated to 500px for better visualization

        // Article information section
        const dateStr = articleData && articleData.isGeneratedDate ? 'Unknown (Generated)' :
            (articleData && articleData.parsedDate ? articleData.parsedDate.toLocaleDateString() : 'N/A');

        let html = `
        <div style="position: relative;">
            <div style="position: absolute; top: -5px; right: 0px; cursor: pointer; z-index: 10; color: #FFF; font-size: 30px; font-weight: 300; line-height: 1; padding: 5px 10px; transition: transform 0.2s ease;"
                 id="keyword-panel-close"
                 onmouseover="this.style.transform='scale(1.2)'"
                 onmouseout="this.style.transform='scale(1)'"
                 title="Close">×</div>
        </div>
        <div style="margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
            <div style="margin-bottom: 8px;">
                <div style="color: #FFF; font-family: 'Neue Haas Grotesk Display Pro'; font-size: 18px; font-style: normal; font-weight: 500; line-height: normal; text-transform: uppercase; margin-bottom: 2px;">TITLE</div>
                <div style="color: #FFF; font-family: 'Neue Haas Grotesk Display Pro'; font-size: 35px; font-style: normal; font-weight: 700; line-height: normal;">
                    ${articleData ? (articleData.title || 'N/A') : 'N/A'}${articleData && articleData['COVID (add yes/ no)'] && articleData['COVID (add yes/ no)'].toLowerCase() === 'no' ?
                '<span id="covid-info-icon" style="color: #ffffff; font-size: 20px; border: 1px solid #ffffff; border-radius: 50%; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; margin-left: 10px; vertical-align: text-bottom; cursor: pointer;" title="Non-COVID Related">!</span>' : ''}
                </div>
                <div style="color: #FFF; font-family: 'Neue Haas Grotesk Display Pro'; font-size: 15px; font-style: normal; font-weight: 500; line-height: normal; margin-top: 8px; word-break: break-all;">
                    ${articleData ? (articleData.url || 'N/A') : 'N/A'}
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                <div style="flex: 1;">
                    <div style="color: #FFF; font-family: 'Neue Haas Grotesk Display Pro'; font-size: 18px; font-style: normal; font-weight: 500; line-height: normal; text-transform: uppercase; margin-bottom: 2px; border-bottom: 1px solid #fff; display: inline-block; padding-bottom: 1px;">DATE</div>
                    <div style="color: #FFF; font-family: 'Neue Haas Grotesk Display Pro'; font-size: 25px; font-style: normal; font-weight: 600; line-height: normal;">${dateStr}</div>
                </div>
                <div style="flex: 1; margin-left: 15px;">
                    <div style="color: #FFF; font-family: 'Neue Haas Grotesk Display Pro'; font-size: 18px; font-style: normal; font-weight: 500; line-height: normal; text-transform: uppercase; margin-bottom: 2px; border-bottom: 1px solid #fff; display: inline-block; padding-bottom: 1px;">TYPE</div>
                    <div style="color: #FFF; font-family: 'Neue Haas Grotesk Display Pro'; font-size: 25px; font-style: normal; font-weight: 600; line-height: normal;">${articleData ? (articleData.type1 || 'N/A') : 'N/A'}</div>
                </div>
            </div>
        </div>
        <div style="margin-bottom: 10px;">
            <div style="color: #FFF; font-family: 'Neue Haas Grotesk Display Pro'; font-size: 25px; font-style: normal; font-weight: 600; line-height: normal; display: inline;">${keywords.length}</div>
            <div style="color: #FFF; font-family: 'Neue Haas Grotesk Display Pro'; font-size: 18px; font-style: normal; font-weight: 500; line-height: normal; display: inline; margin-left: 8px;">KEYWORDS</div>
        </div>
    `;
        html += `<div style="position: relative; width: ${keywordWidth}px; height: ${keywordHeight}px; margin: 10px 0;">`;

        const centerX = keywordWidth / 2;
        const centerY = keywordHeight / 2;

        // 🔗 SVG连接线 - 从中心辐射到关键词
        html += `<svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;">`;

        const numKeywords = keywords.length;
        keywords.forEach((keyword, index) => {
            let angle, radius;

            if (numKeywords <= 8) {
                // 单层椭圆分布，偏向竖直
                angle = (index / numKeywords) * 2 * Math.PI - Math.PI / 2;
                const radiusX = 200;  // 水平半径增加 (increased from 120)
                const radiusY = 220; // 垂直半径增加 (increased from 180)

                const keywordX = centerX + radiusX * Math.cos(angle);
                const keywordY = centerY + radiusY * Math.sin(angle);

                html += `<line x1="${centerX}" y1="${centerY}" x2="${keywordX}" y2="${keywordY}"
                    stroke="#ddd" stroke-width="1" opacity="0.6"/>`;
            } else {
                // 多层分布
                if (index < 6) {
                    // 内层
                    angle = (index / 6) * 2 * Math.PI - Math.PI / 2;
                    const radiusX = 140;  // increased from 80
                    const radiusY = 170;  // increased from 120

                    const keywordX = centerX + radiusX * Math.cos(angle);
                    const keywordY = centerY + radiusY * Math.sin(angle);

                    html += `<line x1="${centerX}" y1="${centerY}" x2="${keywordX}" y2="${keywordY}"
                        stroke="#ddd" stroke-width="1" opacity="0.6"/>`;
                } else {
                    // 外层
                    const outerCount = numKeywords - 6;
                    const circleIndex = index - 6;
                    angle = (circleIndex / outerCount) * 2 * Math.PI - Math.PI / 2;
                    const radiusX = 220;  // increased from 140
                    const radiusY = 240;  // increased from 200

                    const keywordX = centerX + radiusX * Math.cos(angle);
                    const keywordY = centerY + radiusY * Math.sin(angle);

                    html += `<line x1="${centerX}" y1="${centerY}" x2="${keywordX}" y2="${keywordY}"
                        stroke="#ddd" stroke-width="1" opacity="0.6"/>`;
                }
            }
        });

        html += `</svg>`;

        // 🔗 中心节点
        let centerColor = '#FFD700';
        let borderColor = '#FFF8DC';
        let shadowColor = 'rgba(255, 215, 0, 0.6)';

        if (currentKeywordSelection && currentKeywordSelection.group) {
            centerColor = colorScale(currentKeywordSelection.group);
            borderColor = '#ffffff';
            const rgbMatch = centerColor.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
            if (rgbMatch) {
                const r = parseInt(rgbMatch[1], 16);
                const g = parseInt(rgbMatch[2], 16);
                const b = parseInt(rgbMatch[3], 16);
                shadowColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
            }
        }

        // Center element with outlined circle design
        html += `<div style="position: absolute; left: ${centerX - 8}px; top: ${centerY - 8}px;
        width: 16px; height: 16px; background: #000000; border-radius: 50%;
        border: 2px solid #ffffff; z-index: 2;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 6px; height: 6px; background: #ffffff; border-radius: 50%;"></div>
        </div>`;

        // 🔗 关键词按钮 - 椭圆形竖向分布
        keywords.forEach((keyword, index) => {
            let keywordX, keywordY;

            if (numKeywords <= 8) {
                const angle = (index / numKeywords) * 2 * Math.PI - Math.PI / 2;
                const radiusX = 200;  // increased from 120
                const radiusY = 220;  // increased from 180

                keywordX = centerX + radiusX * Math.cos(angle);
                keywordY = centerY + radiusY * Math.sin(angle);
            } else {
                if (index < 6) {
                    const angle = (index / 6) * 2 * Math.PI - Math.PI / 2;
                    const radiusX = 140;  // increased from 80
                    const radiusY = 170;  // increased from 120

                    keywordX = centerX + radiusX * Math.cos(angle);
                    keywordY = centerY + radiusY * Math.sin(angle);
                } else {
                    const outerCount = numKeywords - 6;
                    const circleIndex = index - 6;
                    const angle = (circleIndex / outerCount) * 2 * Math.PI - Math.PI / 2;
                    const radiusX = 220;  // increased from 140
                    const radiusY = 240;  // increased from 200

                    keywordX = centerX + radiusX * Math.cos(angle);
                    keywordY = centerY + radiusY * Math.sin(angle);
                }
            }

            const displayText = keyword;

            html += `<div style="position: absolute; left: ${keywordX}px; top: ${keywordY}px;
                transform: translate(-50%, -50%);
                background: #000000; border: 1px solid #FFFFFF; border-radius: 15px;
                padding: 4px 16px; color: #FFF; text-align: center;
                font-family: 'Neue Haas Grotesk Display Pro'; font-size: 18px; font-style: normal; font-weight: 500; line-height: normal;
                cursor: pointer; user-select: none; z-index: 3;
                white-space: nowrap;"
                data-keyword="${keyword}" class="keyword-clickable"
                title="${keyword}">
                ${displayText}
                </div>`;
        });

        html += '</div>';
        panel.innerHTML = html;

        // Add close button event listener
        const closeButton = document.getElementById('keyword-panel-close');
        if (closeButton) {
            closeButton.addEventListener('click', function (e) {
                trackActivity(); // Track user activity
                e.preventDefault();
                e.stopPropagation();
                console.log('Close button clicked - resetting visualization');
                resetVisualization();
            });
        }

        // Add COVID info icon click handler
        const covidInfoIcon = document.getElementById('covid-info-icon');
        if (covidInfoIcon) {
            covidInfoIcon.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                // Create and show tooltip
                const tooltip = document.createElement('div');
                tooltip.style.cssText = `
                    position: absolute;
                    background: #000;
                    color: #fff;
                    padding: 10px 15px;
                    border: 1px solid #fff;
                    border-radius: 5px;
                    font-family: 'Neue Haas Grotesk Display Pro';
                    font-size: 14px;
                    z-index: 1000;
                    pointer-events: none;
                    white-space: nowrap;
                `;
                tooltip.textContent = 'This site may no longer be related to COVID-19.';

                // Position tooltip near the icon
                const rect = covidInfoIcon.getBoundingClientRect();
                tooltip.style.left = (rect.left + rect.width + 10) + 'px';
                tooltip.style.top = (rect.top - 5) + 'px';

                document.body.appendChild(tooltip);

                // Remove tooltip after 3 seconds
                setTimeout(() => {
                    if (tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                }, 3000);
            });
        }

        // 🔗 重新绑定关键词点击事件
        panel.querySelectorAll('.keyword-clickable').forEach(element => {
            // Click event
            element.addEventListener('click', function () {
                trackActivity(); // Track user activity
                const keyword = this.getAttribute('data-keyword');
                console.log('🔗 Keyword clicked:', keyword);

                // Auto-pause timeline when keyword is clicked
                if (timelinePlayer.isPlaying) {
                    pauseTimeline();
                    console.log('⏸️ Timeline auto-paused due to keyword click');
                }

                // Toggle selected state
                const isSelected = this.classList.contains('selected');

                // Remove selected class from all other keywords
                panel.querySelectorAll('.keyword-clickable').forEach(el => {
                    el.classList.remove('selected');
                    el.style.background = '#000000';
                    el.style.color = '#FFF';
                    el.style.border = '1px solid #FFFFFF';
                });

                // Toggle current keyword
                if (!isSelected) {
                    this.classList.add('selected');
                    this.style.background = '#FFFFFF';
                    this.style.color = '#000000';
                    this.style.border = '1px solid #000000';
                }

                highlightKeyword(keyword);
            });

            // Hover events removed - no animation on keyword pills

            // Touch event
            element.addEventListener('touchend', function (e) {
                e.preventDefault();
                const keyword = this.getAttribute('data-keyword');
                console.log('🔗 Keyword touched:', keyword);

                // Auto-pause timeline when keyword is touched
                if (timelinePlayer.isPlaying) {
                    pauseTimeline();
                    console.log('⏸️ Timeline auto-paused due to keyword touch');
                }

                // Toggle selected state for touch
                const isSelected = this.classList.contains('selected');

                // Remove selected class from all other keywords
                panel.querySelectorAll('.keyword-clickable').forEach(el => {
                    el.classList.remove('selected');
                    el.style.background = '#000000';
                    el.style.color = '#FFF';
                    el.style.border = '1px solid #FFFFFF';
                });

                // Toggle current keyword
                if (!isSelected) {
                    this.classList.add('selected');
                    this.style.background = '#FFFFFF';
                    this.style.color = '#000000';
                    this.style.border = '1px solid #000000';
                }

                highlightKeyword(keyword);
            });
        });

        console.log('✅ Vertical radial keyword panel displayed');
    }

    console.log('🔗 Original radial keyword design restored!');





    function highlightKeyword(selectedKeyword) {
        console.log('Highlighting keyword:', selectedKeyword);
        const startTime = performance.now();

        if (!svg || !filteredData) {
            console.error('SVG or filteredData not available');
            return;
        }

        // Store the selected keyword globally
        currentSelectedKeyword = selectedKeyword;

        svg.selectAll('.connection-line').remove();

        // Dim all visible nodes
        svg.selectAll('.node')
            .each(function (d) {
                const currentOpacity = parseFloat(d3.select(this).attr('opacity') || 0);
                if (currentOpacity > 0) {
                    // Only dim nodes that are currently visible
                    d3.select(this)
                        .attr('opacity', 0.1)
                        .attr('r', d.radius)
                        .style('filter', 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.2))');
                }
            });

        // OPTIMIZATION: Use keywordIndex for O(1) lookup instead of filtering
        const trimmedKeyword = selectedKeyword.trim();
        const allNodesWithKeyword = keywordIndex.get(trimmedKeyword) || [];

        // Use ALL nodes with keyword, not just currently visible ones
        // This ensures connection lines persist during animation
        const nodesWithKeyword = allNodesWithKeyword;

        console.log(`Found ${allNodesWithKeyword.length} total nodes with keyword: ${selectedKeyword}`);

        if (nodesWithKeyword.length === 0) {
            console.warn('No nodes found with keyword:', selectedKeyword);
            return;
        }

        // OPTIMIZATION: Limit connection lines for very popular keywords
        const MAX_CONNECTIONS = 500; // Limit total connections to maintain performance
        // Use consistent style for all connection lines regardless of quantity
        const lineOpacity = 0.5;
        const lineColor = '#BBBBBB';
        const lineWidth = 1.0;

        // Calculate how many connections we'd create
        const totalPossibleConnections = (nodesWithKeyword.length * (nodesWithKeyword.length - 1)) / 2;
        const shouldLimitConnections = totalPossibleConnections > MAX_CONNECTIONS;

        console.log(`Keyword "${selectedKeyword}": ${nodesWithKeyword.length} nodes, ${totalPossibleConnections} possible connections ${shouldLimitConnections ? '(limiting to ' + MAX_CONNECTIONS + ')' : ''}`);

        const connectionLinesGroup = svg.select('.connection-lines');
        let connectionsDrawn = 0;
        const samplingRate = shouldLimitConnections ? MAX_CONNECTIONS / totalPossibleConnections : 1;

        // Draw connection lines for ALL nodes (not just currently visible ones)
        // Visibility will be managed by updateNodeOpacities() during animation
        for (let i = 0; i < nodesWithKeyword.length; i++) {
            for (let j = i + 1; j < nodesWithKeyword.length; j++) {
                // OPTIMIZATION: Sample connections for very popular keywords
                if (shouldLimitConnections && Math.random() > samplingRate) {
                    continue;
                }

                const node1 = nodesWithKeyword[i];
                const node2 = nodesWithKeyword[j];

                const midX = (node1.displayX + node2.displayX) / 2;
                const midY = (node1.displayY + node2.displayY) / 2;
                const offsetX = -(node2.displayY - node1.displayY) * 0.1;
                const offsetY = (node2.displayX - node1.displayX) * 0.1;

                const path = `M ${node1.displayX} ${node1.displayY} Q ${midX + offsetX} ${midY + offsetY} ${node2.displayX} ${node2.displayY}`;

                connectionLinesGroup.append('path')
                    .attr('d', path)
                    .attr('class', 'connection-line highlighted')
                    .attr('data-node1', node1.id)
                    .attr('data-node2', node2.id)
                    .style('stroke', lineColor)
                    .style('opacity', 0) // Start hidden - updateNodeOpacities will show them
                    .style('stroke-width', lineWidth);

                connectionsDrawn++;
                if (shouldLimitConnections && connectionsDrawn >= MAX_CONNECTIONS) {
                    break;
                }
            }
            if (shouldLimitConnections && connectionsDrawn >= MAX_CONNECTIONS) {
                break;
            }
        }

        // Update connection line visibilities immediately based on current node states
        updateConnectionLineVisibilities();

        // OPTIMIZATION: Use a Set for O(1) lookup when filtering nodes
        const highlightedNodeIds = new Set(nodesWithKeyword.map(n => n.id));
        if (currentKeywordSelection) {
            highlightedNodeIds.add(currentKeywordSelection.id);
        }

        // OPTIMIZATION: Single selectAll with filter instead of multiple operations
        svg.selectAll('.node')
            .each(function (d) {
                if (highlightedNodeIds.has(d.id)) {
                    // Only highlight if the node is currently visible (opacity > 0)
                    const currentOpacity = parseFloat(d3.select(this).attr('opacity') || 0);
                    if (currentOpacity > 0) {
                        d3.select(this)
                            .attr('opacity', 1)
                            .attr('r', d.radius)
                            .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))')
                            .raise();
                    }
                }
            });

        // Raise connection lines and indicators AFTER nodes so they appear on top
        const connectionLines = svg.selectAll('.connection-line');
        const longPressIndicator = svg.selectAll('.long-press-indicator');

        connectionLines.raise();
        longPressIndicator.raise();

        const endTime = performance.now();
        console.log(`✅ Highlighted ${nodesWithKeyword.length} nodes with ${connectionsDrawn} connection lines in ${(endTime - startTime).toFixed(2)}ms`);
    }






    // Helper function to wrap text
    function wrapText(text, maxLength) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            if ((currentLine + word).length <= maxLength) {
                currentLine += word + ' ';
            } else {
                lines.push(currentLine.trim());
                currentLine = word + ' ';
            }
        });

        if (currentLine.length > 0) {
            lines.push(currentLine.trim());
        }

        return lines;
    }
});

function resetVisualization() {
    console.log('🔄 RESET called - checking if it should proceed...');
    console.log('🔄 RESET called from:', arguments.callee.caller?.name || 'unknown');

    const now = Date.now();
    const lastNodeTime = window.lastNodeInteraction || 0;
    const lastCategoryTime = window.lastCategoryInteraction || 0;

    if (now - lastNodeTime < 1000) {
        console.log('❌ Recent node interaction detected, skipping reset');
        return;
    }

    if (now - lastCategoryTime < 1000) {
        console.log('❌ Recent category interaction detected, skipping reset');
        return;
    }

    console.log('✅ Proceeding with reset...');

    currentSelection = null;
    currentKeywordSelection = null;
    currentCategorySelection = null;
    currentSelectedKeyword = null;

    Object.keys(legendExpanded).forEach(key => {
        legendExpanded[key] = false;
    });

    // Hide all selected tags
    if (window.hideAllSelectedTags) {
        window.hideAllSelectedTags();
    }

    // SVG dropdown cleanup removed - using HTML dropdowns

    if (svg) {
        console.log('🧹 Cleaning up SVG elements...');

        svg.selectAll('.long-press-indicator, .click-indicator').remove();

        svg.selectAll('.connection-line').remove();

        // Reset nodes to timeline-based visibility instead of making all visible
        updateNodeOpacities();

        // SVG dropdown elements removed - using HTML dropdowns
    }

    console.log('📱 Hiding all panels...');

    const keywordPanel = document.getElementById('keyword-panel');
    if (keywordPanel) {
        keywordPanel.style.display = 'none';
        keywordPanel.innerHTML = '';
        console.log('✅ Keyword panel hidden');
    }

    // Remove class to slide visualization back to center
    const visualizationContainer = document.getElementById('visualization-container');
    if (visualizationContainer) {
        visualizationContainer.classList.remove('panel-open');
    }


    console.log('✅ COMPLETE RESET FINISHED - 所有状态已恢复默认！');
}

// setupFloatingPanelScrollBehavior function removed - no longer needed

function initializeHTMLDropdowns() {
    const categoryItems = document.querySelectorAll('.category-item');
    let activeDropdown = null;

    categoryItems.forEach(item => {
        const categoryName = item.dataset.category;

        // Create dropdown container
        const dropdown = document.createElement('div');
        dropdown.className = 'category-dropdown';

        // Get type1 items for this category
        const type1Items = Object.keys(type1GroupMap).filter(type1 =>
            type1GroupMap[type1] === categoryName
        );

        // Add dropdown items
        type1Items.forEach(type1 => {
            const dropdownItem = document.createElement('div');
            dropdownItem.className = 'dropdown-item';
            dropdownItem.textContent = type1;
            dropdownItem.addEventListener('click', function (e) {
                trackActivity(); // Track user activity
                e.preventDefault();
                e.stopPropagation();
                console.log('Dropdown item clicked:', type1);

                // Auto-pause timeline when dropdown item is clicked
                if (timelinePlayer.isPlaying) {
                    pauseTimeline();
                    console.log('⏸️ Timeline auto-paused due to dropdown item click');
                }

                highlightType1(type1);
                closeDropdown();
            });
            dropdown.appendChild(dropdownItem);
        });

        item.appendChild(dropdown);

        // Add click handler
        item.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            if (activeDropdown === dropdown) {
                closeDropdown();
            } else {
                closeDropdown();
                openDropdown(item, dropdown);
            }
        });
    });

    // Add click handlers for the "x" buttons on selected tags
    document.querySelectorAll('.selected-tag-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Clear selection clicked');

            // Clear the category selection
            currentCategorySelection = null;

            // Hide all selected tags
            if (window.hideAllSelectedTags) {
                window.hideAllSelectedTags();
            }

            // Reset the visualization
            resetVisualization();
        });
    });

    function openDropdown(item, dropdown) {
        activeDropdown = dropdown;
        item.classList.add('active');
        dropdown.classList.add('show');
    }

    function closeDropdown() {
        if (activeDropdown) {
            activeDropdown.classList.remove('show');
            activeDropdown.parentElement.classList.remove('active');
            activeDropdown = null;
        }
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.category-item') && !e.target.closest('.category-dropdown')) {
            closeDropdown();
        }
    });
}

// Timeline Player Functions
function initializeTimelinePlayer() {
    console.log('🎬 Initializing timeline player...');
    console.log('FilteredData length:', filteredData ? filteredData.length : 'No data');

    if (!filteredData || filteredData.length === 0) {
        console.error('❌ No data available for timeline initialization');
        return;
    }

    // Calculate date range from data
    const firstDates = filteredData.map(d => parseUKDate(d.firstDateParsed)).filter(d => d);
    const lastDates = filteredData.map(d => parseUKDate(d.lastDateParsed)).filter(d => d);

    console.log('First dates found:', firstDates.length, 'Last dates found:', lastDates.length);
    console.log('Sample first date:', firstDates[0], 'Sample last date:', lastDates[0]);

    timelinePlayer.startDate = d3.min(firstDates);
    timelinePlayer.endDate = d3.max(lastDates);

    console.log('Timeline range:', timelinePlayer.startDate, 'to', timelinePlayer.endDate);

    if (!timelinePlayer.startDate || !timelinePlayer.endDate) {
        console.error('❌ Could not determine timeline date range');
        return;
    }

    // Update timeline labels
    updateTimelineLabels();

    // Setup timeline controls
    setupTimelineControls();

    // Initialize timeline position to start
    setTimelinePosition(0);

    // Update node opacities based on current time
    updateNodeOpacities();

    // Update button icon to show initial state
    updatePlayButtonIcon();

    // Initialize idle timer
    resetIdleTimer();

    // Auto-start the animation if autoplay is enabled
    if (timelinePlayer.autoplay) {
        setTimeout(() => {
            playTimeline();
        }, 1000); // Start after 1 second delay
    }

    console.log('✅ Timeline player initialized');
}

function updateTimelineLabels() {
    if (!timelinePlayer.startDate || !timelinePlayer.endDate) {
        console.log('❌ Cannot update timeline labels - missing start or end date');
        return;
    }

    const startLabel = document.getElementById('timeline-start-label');
    const endLabel = document.getElementById('timeline-end-label');
    const currentLabel = document.getElementById('timeline-current-label');

    console.log('Timeline label elements found:', {
        startLabel: !!startLabel,
        endLabel: !!endLabel,
        currentLabel: !!currentLabel
    });

    if (startLabel) {
        const startText = formatDateForTimeline(timelinePlayer.startDate);
        startLabel.textContent = startText;
        console.log('Set start label to:', startText);
    }

    if (endLabel) {
        const endText = formatDateForTimeline(timelinePlayer.endDate);
        endLabel.textContent = endText;
        console.log('Set end label to:', endText);
    }

    // Initialize current date to start date
    if (!timelinePlayer.currentDate) {
        timelinePlayer.currentDate = new Date(timelinePlayer.startDate);
    }

    updateCurrentDateLabel();
}

function formatDateForTimeline(date) {
    if (!date) return 'Unknown';
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function updateCurrentDateLabel() {
    const currentLabel = document.getElementById('timeline-current-label');
    console.log('Updating current date label:', {
        currentLabel: !!currentLabel,
        currentDate: timelinePlayer.currentDate
    });

    if (currentLabel && timelinePlayer.currentDate) {
        const currentText = formatDateForTimeline(timelinePlayer.currentDate);
        currentLabel.textContent = currentText;
        console.log('Set current label to:', currentText);
    }
}

function setupTimelineControls() {
    const playButton = document.getElementById('play-pause-btn');
    const timelineHandle = document.getElementById('timeline-handle');
    const timelineTrack = document.querySelector('.timeline-track');

    console.log('Timeline control elements found:', {
        playButton: !!playButton,
        timelineHandle: !!timelineHandle,
        timelineTrack: !!timelineTrack
    });

    // Play/Pause button
    if (playButton) {
        playButton.addEventListener('click', function () {
            trackActivity(); // Track user activity
            toggleTimelinePlayback();
        });
        console.log('✅ Play button event listener added');
    } else {
        console.error('❌ Play button not found');
    }

    // Timeline handle dragging
    if (timelineHandle && timelineTrack) {
        let isDragging = false;

        // Mouse events
        timelineHandle.addEventListener('mousedown', function (e) {
            trackActivity(); // Track user activity
            startDrag(e);
        });
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);

        // Touch events for mobile
        timelineHandle.addEventListener('touchstart', function (e) {
            trackActivity(); // Track user activity
            startDragTouch(e);
        }, { passive: false });
        document.addEventListener('touchmove', dragTouch, { passive: false });
        document.addEventListener('touchend', stopDragTouch, { passive: false });

        // Click on track to jump to position
        timelineTrack.addEventListener('click', function (e) {
            trackActivity(); // Track user activity
            jumpToPosition(e);
        });

        function startDrag(e) {
            e.preventDefault();
            isDragging = true;
            console.log('🎯 Drag started');
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();

            const rect = timelineTrack.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));

            console.log('🎯 Dragging to:', percentage);
            setTimelinePosition(percentage, true);
        }

        function stopDrag() {
            if (isDragging) {
                isDragging = false;
                console.log('🎯 Drag ended');
            }
        }

        function startDragTouch(e) {
            e.preventDefault();
            isDragging = true;
            console.log('🎯 Touch drag started');
        }

        function dragTouch(e) {
            if (!isDragging) return;
            e.preventDefault();

            const touch = e.touches[0];
            const rect = timelineTrack.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));

            console.log('🎯 Touch dragging to:', percentage);
            setTimelinePosition(percentage, true);
        }

        function stopDragTouch() {
            if (isDragging) {
                isDragging = false;
                console.log('🎯 Touch drag ended');
            }
        }

        function jumpToPosition(e) {
            // Don't jump if we just finished dragging
            if (isDragging) return;

            const rect = timelineTrack.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));

            console.log('🎯 Jumping to:', percentage);
            setTimelinePosition(percentage);
        }
    }
}

function setTimelinePosition(percentage, isDragging = false) {
    timelinePlayer.currentTime = percentage;

    // Calculate current date
    if (timelinePlayer.startDate && timelinePlayer.endDate) {
        const timeDiff = timelinePlayer.endDate - timelinePlayer.startDate;
        timelinePlayer.currentDate = new Date(timelinePlayer.startDate.getTime() + (timeDiff * percentage));
        updateCurrentDateLabel();
    }

    // Update handle position smoothly
    const handle = document.getElementById('timeline-handle');
    if (handle) {
        if (isDragging) {
            // Immediate update while dragging for responsiveness
            handle.style.left = `${percentage * 100}%`;
        } else {
            // Smooth transition when not dragging
            handle.style.transition = 'left 0.1s ease';
            handle.style.left = `${percentage * 100}%`;
        }
    }

    // Update node opacities
    updateNodeOpacities();
}

function updatePlayButtonIcon() {
    const playButton = document.getElementById('play-pause-btn');

    if (playButton) {
        playButton.classList.toggle('playing', timelinePlayer.isPlaying);

        // Update button icon
        const svg = playButton.querySelector('svg');
        if (svg) {
            if (timelinePlayer.isPlaying) {
                // Pause icon (complete SVG)
                svg.innerHTML = '<circle cx="15" cy="15" r="14.25" fill="#D9D9D9" stroke="white" stroke-width="1.5"/><rect x="11" y="9" width="2" height="12" rx="1" fill="black"/><rect x="17" y="9" width="2" height="12" rx="1" fill="black"/>';
            } else {
                // Play icon (complete SVG)
                svg.innerHTML = '<path d="M22.5 14.134C23.1667 14.5189 23.1667 15.4811 22.5 15.866L12 21.9282C11.3333 22.3131 10.5 21.832 10.5 21.0622L10.5 8.93782C10.5 8.16802 11.3333 7.6869 12 8.0718L22.5 14.134Z" fill="white"/><circle cx="15" cy="15" r="14.25" stroke="white" stroke-width="1.5"/>';
            }
        }
    }
}

function toggleTimelinePlayback() {
    if (timelinePlayer.isPlaying) {
        pauseTimeline();
    } else {
        playTimeline();
    }
}

function playTimeline() {
    timelinePlayer.isPlaying = true;
    updatePlayButtonIcon();
    animateTimeline();
}

function pauseTimeline() {
    timelinePlayer.isPlaying = false;
    updatePlayButtonIcon();
    if (timelinePlayer.animationFrame) {
        cancelAnimationFrame(timelinePlayer.animationFrame);
        timelinePlayer.animationFrame = null;
    }
}

function animateTimeline() {
    if (!timelinePlayer.isPlaying) return;

    timelinePlayer.currentTime += timelinePlayer.animationSpeed;

    if (timelinePlayer.currentTime >= 1) {
        if (timelinePlayer.loop) {
            // Loop back to the beginning
            timelinePlayer.currentTime = 0;
            console.log('🔄 Timeline looping back to start');

            // Clear all selections when animation restarts
            currentSelection = null;
            currentKeywordSelection = null;
            currentCategorySelection = null;
            currentSelectedKeyword = null;

            console.log('🧹 Selection variables cleared:', {
                currentSelection,
                currentKeywordSelection,
                currentCategorySelection,
                currentSelectedKeyword
            });

            // Hide all selected tags
            if (window.hideAllSelectedTags) {
                window.hideAllSelectedTags();
            }

            // Remove connection lines and all visual indicators
            if (svg) {
                svg.selectAll('.connection-line').remove();
                svg.selectAll('.long-press-indicator, .click-indicator').remove();

                // Immediately interrupt all transitions and reset node styles to normal state
                svg.selectAll('.node')
                    .interrupt()
                    .style('filter', null)
                    .attr('r', d => d.radius)
                    .attr('opacity', 0); // Reset to 0 first, will be updated by updateNodeOpacities
            }

            // Close keyword panel
            const keywordPanel = document.getElementById('keyword-panel');
            if (keywordPanel) {
                keywordPanel.style.display = 'none';
                keywordPanel.innerHTML = '';
            }

            // Remove panel-open class
            const visualizationContainer = document.getElementById('visualization-container');
            if (visualizationContainer) {
                visualizationContainer.classList.remove('panel-open');
            }

            console.log('🧹 Cleared all selections on animation restart');
        } else {
            // Stop at the end
            timelinePlayer.currentTime = 1;
            pauseTimeline();
        }
    }

    // Update timeline position (this updates currentDate and calls updateNodeOpacities)
    setTimelinePosition(timelinePlayer.currentTime);

    // Force an additional update after setTimelinePosition to ensure cleared selections are reflected
    // (setTimelinePosition already calls updateNodeOpacities, but this ensures it happens with correct date)
    if (timelinePlayer.currentTime === 0 && svg && filteredData && timelinePlayer.currentDate) {
        // Double-check that selections are cleared by explicitly calling updateNodeOpacities
        // The hasActiveSelection check should now be false since all variables are null
        updateNodeOpacities();
    }

    timelinePlayer.animationFrame = requestAnimationFrame(animateTimeline);
}

function getHighlightedNodeIds() {
    const highlightedNodeIds = new Set();

    // HIERARCHY: Keyword selection (highest priority)
    // If a keyword is selected, highlight nodes with that keyword
    if (currentSelectedKeyword && keywordIndex.has(currentSelectedKeyword.trim())) {
        const nodesWithKeyword = keywordIndex.get(currentSelectedKeyword.trim()) || [];
        nodesWithKeyword.forEach(node => highlightedNodeIds.add(node.id));

        // Also include the originally clicked node if there was one
        if (currentKeywordSelection) {
            highlightedNodeIds.add(currentKeywordSelection.id);
        }
    }
    // HIERARCHY: Single node selected (no keyword) - only if no keyword is selected
    else if ((currentKeywordSelection || currentSelection) && !currentSelectedKeyword) {
        const selectedNode = currentKeywordSelection || currentSelection;
        if (selectedNode && selectedNode.keywords) {
            // Include the clicked node itself
            highlightedNodeIds.add(selectedNode.id);

            // Include all nodes that share any keyword with the selected node
            selectedNode.keywords.forEach(keyword => {
                const trimmedKeyword = keyword.trim();
                if (keywordIndex.has(trimmedKeyword)) {
                    const nodesWithKeyword = keywordIndex.get(trimmedKeyword) || [];
                    nodesWithKeyword.forEach(node => highlightedNodeIds.add(node.id));
                }
            });
        }
    }

    // Get nodes from category selection (independent of keyword/node selection)
    if (currentCategorySelection && currentCategorySelection.type1) {
        const selectedType1 = currentCategorySelection.type1;
        let targetTypes = [selectedType1];
        if (selectedType1 === 'Parliament') {
            targetTypes = ['Parliament', 'Scottish Government and Parliament'];
        }

        filteredData.forEach(node => {
            if (targetTypes.includes(node.type1)) {
                highlightedNodeIds.add(node.id);
            }
        });
    }

    return highlightedNodeIds;
}

function updateConnectionLineVisibilities() {
    if (!svg || !filteredData || !timelinePlayer.currentDate) return;

    // Get all currently visible nodes by checking date ranges directly (more reliable than DOM opacity)
    // Store both string and number versions of IDs for reliable matching
    const visibleNodeIds = new Set();

    filteredData.forEach(node => {
        const firstDate = parseUKDate(node.firstDateParsed);
        const lastDate = parseUKDate(node.lastDateParsed);

        if (firstDate && lastDate && timelinePlayer.currentDate) {
            if (timelinePlayer.currentDate >= firstDate && timelinePlayer.currentDate <= lastDate) {
                // Node is within the current date range - it should be visible
                // Store both string and number versions for reliable matching
                const nodeId = String(node.id);
                visibleNodeIds.add(nodeId);
                // Also add as number if it's a valid number
                const numId = Number(nodeId);
                if (!isNaN(numId)) {
                    visibleNodeIds.add(numId);
                }
            }
        }
    });

    // Update connection line opacities based on node visibility
    svg.selectAll('.connection-line').each(function () {
        const line = d3.select(this);
        const node1Id = line.attr('data-node1');
        const node2Id = line.attr('data-node2');

        // Try both string and number versions for matching
        const node1IdStr = String(node1Id);
        const node2IdStr = String(node2Id);
        const node1IdNum = Number(node1Id);
        const node2IdNum = Number(node2Id);

        // Check if nodes are visible (both must be visible for line to show)
        const node1Visible = visibleNodeIds.has(node1IdStr) || (!isNaN(node1IdNum) && visibleNodeIds.has(node1IdNum));
        const node2Visible = visibleNodeIds.has(node2IdStr) || (!isNaN(node2IdNum) && visibleNodeIds.has(node2IdNum));

        if (node1Visible && node2Visible) {
            // Both nodes visible - show line at full opacity
            line.transition().duration(200).style('opacity', 0.5);
        } else {
            // One or both nodes invisible - hide line completely
            line.transition().duration(200).style('opacity', 0);
        }
    });
}

function updateNodeOpacities() {
    if (!svg || !filteredData || !timelinePlayer.currentDate) return;

    console.log('Updating node opacities for date:', timelinePlayer.currentDate.toISOString().split('T')[0]);

    // Check if we have an active selection (respecting hierarchy)
    // Priority: keyword > single node > category > nothing
    const hasActiveSelection = currentSelectedKeyword ||
                                (currentSelection || currentKeywordSelection) ||
                                currentCategorySelection;

    // Debug log when animation restarts to verify selections are cleared
    if (timelinePlayer.currentTime === 0 && !hasActiveSelection) {
        console.log('✅ No active selection detected - all nodes will show normally');
    }

    // Get all currently visible nodes and highlighted nodes
    const visibleNodeIds = new Set();

    // First pass: determine which nodes are visible
    svg.selectAll('.node')
        .each(function (d) {
            const firstDate = parseUKDate(d.firstDateParsed);
            const lastDate = parseUKDate(d.lastDateParsed);

            if (firstDate && lastDate && timelinePlayer.currentDate) {
                if (timelinePlayer.currentDate >= firstDate && timelinePlayer.currentDate <= lastDate) {
                    // Normalize ID to string for consistent comparison
                    visibleNodeIds.add(String(d.id)); // Track visible nodes
                }
            }
        });

    // Check if the PRIMARY selected node (the one originally clicked) is still visible
    // If the selected node disappears, clear the selection (like clicking X)
    // We only check the primary node, not all highlighted nodes, to avoid clearing on unrelated timeline changes
    // Note: Category selections don't have a primary node, so we don't auto-clear those
    if (hasActiveSelection && (currentKeywordSelection || currentSelection)) {
        let primaryNodeStillVisible = false;

        // Find the primary selected node (the one originally clicked)
        let primarySelectedNode = null;
        if (currentKeywordSelection) {
            primarySelectedNode = currentKeywordSelection;
        } else if (currentSelection) {
            primarySelectedNode = currentSelection;
        }

        // Check if the primary selected node is still visible
        if (primarySelectedNode) {
            const primaryNodeIdStr = String(primarySelectedNode.id);
            primaryNodeStillVisible = visibleNodeIds.has(primaryNodeIdStr);

            // Double-check by verifying date range directly if not found in visible set
            // This prevents false positives from ID mismatch issues
            if (!primaryNodeStillVisible && timelinePlayer.currentDate) {
                const nodeFirstDate = parseUKDate(primarySelectedNode.firstDateParsed);
                const nodeLastDate = parseUKDate(primarySelectedNode.lastDateParsed);

                if (nodeFirstDate && nodeLastDate) {
                    // Node is actually visible if current date is within its range
                    if (timelinePlayer.currentDate >= nodeFirstDate && timelinePlayer.currentDate <= nodeLastDate) {
                        primaryNodeStillVisible = true;
                        console.log('⚠️ Node is actually visible but not found in visibleNodeIds set - correcting');
                    }
                }
            }

            // Debug log to help diagnose issues (only when not visible)
            if (!primaryNodeStillVisible && visibleNodeIds.size > 0) {
                console.log('🔍 Primary node not found in visible set:', {
                    primaryNodeId: primarySelectedNode.id,
                    primaryNodeIdStr: primaryNodeIdStr,
                    visibleNodeIdsSize: visibleNodeIds.size,
                    sampleVisibleIds: Array.from(visibleNodeIds).slice(0, 5),
                    currentDate: timelinePlayer.currentDate?.toISOString().split('T')[0],
                    nodeFirstDate: primarySelectedNode.firstDateParsed,
                    nodeLastDate: primarySelectedNode.lastDateParsed
                });
            }
        }

        // Only clear if the primary selected node is no longer visible
        if (primarySelectedNode && !primaryNodeStillVisible) {
            console.log('🧹 Primary selected node no longer visible - clearing selection');

            // Clear all selections
            currentSelection = null;
            currentKeywordSelection = null;
            currentCategorySelection = null;
            currentSelectedKeyword = null;

            // Hide all selected tags
            if (window.hideAllSelectedTags) {
                window.hideAllSelectedTags();
            }

            // Remove connection lines and visual indicators
            if (svg) {
                svg.selectAll('.connection-line').remove();
                svg.selectAll('.long-press-indicator, .click-indicator').remove();
            }

            // Close keyword panel
            const keywordPanel = document.getElementById('keyword-panel');
            if (keywordPanel) {
                keywordPanel.style.display = 'none';
                keywordPanel.innerHTML = '';
            }

            // Remove panel-open class
            const visualizationContainer = document.getElementById('visualization-container');
            if (visualizationContainer) {
                visualizationContainer.classList.remove('panel-open');
            }

            // Update hasActiveSelection after clearing
            // Will re-evaluate in the loop below
        }
    }

    // Re-check hasActiveSelection after potential clearing
    const hasActiveSelectionNow = currentSelectedKeyword ||
                                  (currentSelection || currentKeywordSelection) ||
                                  currentCategorySelection;
    const highlightedNodeIds = hasActiveSelectionNow ? getHighlightedNodeIds() : new Set();

    // Second pass: update node opacities and styles
    svg.selectAll('.node')
        .each(function (d) {
            const firstDate = parseUKDate(d.firstDateParsed);
            const lastDate = parseUKDate(d.lastDateParsed);

            let opacity = 0;
            let shouldHighlight = false;

            if (firstDate && lastDate && timelinePlayer.currentDate) {
                if (timelinePlayer.currentDate >= firstDate && timelinePlayer.currentDate <= lastDate) {
                    // Check if this node should be highlighted
                    const nodeIdStr = String(d.id);
                    if (hasActiveSelectionNow && highlightedNodeIds.has(d.id)) {
                        shouldHighlight = true;
                        opacity = 1; // Highlighted nodes get full opacity
                    } else if (hasActiveSelectionNow) {
                        // If there's an active selection but this node isn't highlighted, dim it
                        opacity = 0.1;
                    } else {
                        // No active selection - normal opacity
                        opacity = 0.8;
                    }
                }
            }

            const nodeSelection = d3.select(this);

            // Update opacity with transition
            nodeSelection.transition().duration(200).attr('opacity', opacity);

            // Apply appropriate styling based on selection state (use hasActiveSelectionNow after potential clearing)
            if (hasActiveSelectionNow) {
                if (shouldHighlight && opacity > 0) {
                    // Highlighted nodes get bright glow
                    nodeSelection
                        .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))')
                        .raise();
                } else if (!shouldHighlight && opacity > 0) {
                    // Non-highlighted visible nodes get dim glow
                    nodeSelection
                        .style('filter', 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.2))');
                } else {
                    // Hidden nodes - clear filter
                    nodeSelection.style('filter', null);
                }
            } else {
                // No active selection - clear any filter effects
                nodeSelection.style('filter', null);
            }
        });

    // Update connection line visibilities if we have an active selection (after potential clearing)
    if (hasActiveSelectionNow) {
        updateConnectionLineVisibilities();
    }
}

// Debug function to manually test timeline
window.testTimeline = function () {
    console.log('🧪 Testing timeline manually...');
    console.log('FilteredData available:', !!filteredData);
    console.log('FilteredData length:', filteredData ? filteredData.length : 0);

    if (filteredData && filteredData.length > 0) {
        console.log('Sample data:', filteredData[0]);
        console.log('First date parsed:', filteredData[0].firstDateParsed);
        console.log('Last date parsed:', filteredData[0].lastDateParsed);

        // Try to initialize timeline
        initializeTimelinePlayer();
    } else {
        console.error('No data available for timeline test');
    }
};
