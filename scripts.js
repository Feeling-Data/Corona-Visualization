let svg, xScale, yScale, colorScale, allData, filteredData;
let currentSelection = null;
let currentKeywordSelection = null;
let legendExpanded = {};
let nodeMap = new Map(); // OPTIMIZATION: Fast O(1) node lookup by ID
let keywordIndex = new Map(); // OPTIMIZATION: Fast keyword-to-nodes lookup
// activeGroupDropdown removed - no longer using SVG dropdowns

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

    'Health': 'Knowledge',
    'Health and Social Care': 'Knowledge',
    'Education': 'Knowledge',
    'School': 'Knowledge',
    'School, Primary': 'Knowledge',
    'School, Secondary': 'Knowledge',
    'School, ASL': 'Knowledge',
    'School, Independent': 'Knowledge',
    'Libraries and Archives': 'Knowledge',
    'Research': 'Knowledge',
    'Science': 'Knowledge',
    'Think Tank': 'Knowledge',
    'History': 'Knowledge',
    'Heritage': 'Knowledge',

    'Sports': 'Media',
    'News': 'Media',
    'Media': 'Media',
    'Blog': 'Media',
    'Heritage and Tourism': 'Media',
    'Business': 'Media',
    'Retail': 'Media',
    'Food and Drink': 'Media',
    'Oil': 'Media',
    'Timber': 'Media',
    'Voluntary': 'Media',
    'Charity': 'Government',
    'Nature': 'Media',
    'Wildlife': 'Media',
    'Church and religion': 'Government',
    'Religion': 'Media'
};

const groupOrder = [
    'Media',
    'Entertainment',
    'Knowledge',
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
        height = viewportHeight * 0.9; // Use 90% of viewport height
    } else {
        // For landscape, use most of the available height and full width
        height = viewportHeight * 0.9; // Use 90% of viewport height
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
    const actualHeight = height + 300; // Increased to accommodate more data

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
        d3.csv('data.csv').then(function (rawData) {
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

    function generateRandomDate(minDate, maxDate) {
        const minTime = minDate.getTime();
        const maxTime = maxDate.getTime();
        const randomTime = minTime + Math.random() * (maxTime - minTime);
        return new Date(randomTime);
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
        console.log('Total raw records:', rawData.length);

        const filtered = rawData.filter(d =>
            d.type2 && typeof d.type2 === 'string' &&
            d.type2.toLowerCase().includes('corona')
        );

        console.log('Filtered coronavirus records:', filtered.length);

        const validDates = [];
        let unknownCount = 0;

        filtered.forEach(d => {
            const dateString = d['first_date_parsed'];
            const parsedDate = parseUKDate(dateString);

            if (parsedDate && parsedDate !== 'unknown') {
                validDates.push(parsedDate);
            } else {
                unknownCount++;
            }
        });

        console.log('Valid dates found:', validDates.length);
        console.log('Unknown/invalid dates found:', unknownCount);

        const forcedStartDate = new Date(2020, 2, 13);
        let minDate, maxDate;
        if (validDates.length > 0) {
            minDate = forcedStartDate;
            maxDate = new Date(Math.max(...validDates));
        } else {
            minDate = forcedStartDate;
            maxDate = new Date(2024, 11, 31);
        }

        console.log('Date range:', minDate.toISOString().split('T')[0], 'to', maxDate.toISOString().split('T')[0]);

        let generatedDateCount = 0;
        filtered.forEach((d, index) => {
            const dateString = d['first_date_parsed'];
            const parsedDate = parseUKDate(dateString);

            if (parsedDate && parsedDate !== 'unknown') {
                if (parsedDate < forcedStartDate) {
                    d.parsedDate = generateRandomDate(forcedStartDate, maxDate);
                    d.isGeneratedDate = true;
                    d.originalDateString = dateString;
                    generatedDateCount++;
                    console.log(`Adjusted early date ${dateString} to random date after 2020-03-13`);
                } else {
                    d.parsedDate = parsedDate;
                    d.isGeneratedDate = false;
                }
            } else {
                d.parsedDate = generateRandomDate(forcedStartDate, maxDate);
                d.isGeneratedDate = true;
                d.originalDateString = dateString;
                generatedDateCount++;
            }

            if (!d.id || d.id === 'missing' || d.id === '' || isNaN(+d.id)) {
                d.id = `gen_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            } else {
                d.id = +d.id;
            }

            d.keywords = d["first_keywords_auto"] ? d["first_keywords_auto"].toLowerCase().split(',').map(k => k.trim()).filter(k => k.length > 0) : [];

            if (d.type1 === 'Scottish Government and Parliament') {
                d.type1 = 'Parliament';
            }

            d.group = type1GroupMap[d.type1] || 'Other';

            if (d.type1 === 'Scottish Government and Parliament') {
                d.type1 = 'Parliament';
            }
        });

        console.log(`Total records with generated dates: ${generatedDateCount} out of ${filtered.length}`);

        filteredData = filtered;
        console.log('Filtered data:', filteredData);
        allData = filteredData;

        // OPTIMIZATION: Build fast lookup indices for large datasets
        buildDataIndices();

        if (filteredData.length === 0) {
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('class', 'status-message')
                .text("No coronavirus data found")
                .attr('fill', 'red');
            return;
        }

        console.log(`Successfully processed ${filteredData.length} coronavirus records with valid dates`);
        console.log('Final date range:',
            d3.min(filteredData, d => d.parsedDate).toISOString().split('T')[0],
            'to',
            d3.max(filteredData, d => d.parsedDate).toISOString().split('T')[0]
        );

        setupScales();
        createVisualization();

        // Initialize HTML dropdowns after data is loaded
        initializeHTMLDropdowns();
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

        // Simple time scale using full available height
        yScale = d3.scaleTime()
            .domain([startDate, endDate])
            .range([margin.top + 20, margin.top + availableHeight]);

        // Assign Y positions directly using the time scale
        filteredData.forEach(d => {
            d.adjustedY = yScale(d.parsedDate);
        });

        // Debug: Check the actual Y position distribution
        const yPositions = filteredData.map(d => d.adjustedY);
        const minY = Math.min(...yPositions);
        const maxY = Math.max(...yPositions);
        console.log('Y position range:', minY, 'to', maxY);
        console.log('Expected Y range:', margin.top + 20, 'to', margin.top + availableHeight);
        console.log('Data spans', ((maxY - minY) / availableHeight * 100).toFixed(1) + '% of available height');

        // If data doesn't span enough height, stretch it
        if ((maxY - minY) / availableHeight < 0.5) {
            console.log('Data too compressed, stretching Y positions...');
            const stretchFactor = availableHeight / (maxY - minY) * 0.8; // Use 80% of available height
            const centerY = (minY + maxY) / 2;
            filteredData.forEach(d => {
                d.adjustedY = centerY + (d.adjustedY - centerY) * stretchFactor;
            });
            console.log('Y positions stretched by factor:', stretchFactor);
        }

        // With 100% width, use most of the available width for the visualization
        const availableWidth = width * 0.9; // Use 90% of the full width for better spacing
        const centerOffset = (width - availableWidth) / 2;
        const visualizationStart = centerOffset;

        xScale = d3.scalePoint()
            .domain(groupOrder)
            .range([visualizationStart, visualizationStart + availableWidth])
            .padding(0.4); // Increased padding for better cluster separation

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
            console.log('SVG global click - checking target...');

            const target = event.target;

            if (target.classList.contains('node') ||
                target.tagName === 'circle' ||
                target.closest('.group-category-dropdown') ||
                target.closest('.legend') ||
                target.closest('.category-panel') ||
                target.closest('.axis')) {
                console.log('Important element clicked - not resetting');
                return;
            }

            console.log('Empty area clicked - executing reset');
            resetVisualization();
        });

        svg.on('touchend', function (event) {
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

        svg.selectAll('.connection-line').remove();

        svg.selectAll('.node')
            .attr('opacity', 0.1)
            .attr('r', d => d.radius)
            .style('filter', 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.2))');

        let targetTypes = [selectedType1];
        if (selectedType1 === 'Parliament') {
            targetTypes = ['Parliament', 'Scottish Government and Parliament'];
        }

        const nodesWithType1 = filteredData.filter(d =>
            targetTypes.includes(d.type1)
        );

        console.log(`Found ${nodesWithType1.length} nodes with type1: ${selectedType1}`);
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
                    const isMainSelection = nodesWithType1.some(n => n.id === d.id);
                    d3.select(this)
                        .attr('opacity', 1)
                        .attr('r', isMainSelection ? d.radius * 1.2 : d.radius)
                        .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))');
                }
            });

        const endTime = performance.now();
        console.log(`✅ Highlighted ${nodesWithType1.length} nodes for type1: ${selectedType1} in ${(endTime - startTime).toFixed(2)}ms`);
    }

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
            const groupWidth = isPortrait ? 5 : 30;

            console.log(`Group ${groupName}: centerX=${groupX}, width=${groupWidth}`);

            const sortedData = groupData.sort((a, b) => a.parsedDate - b.parsedDate);

            sortedData.forEach((d, i) => {
                // Initialize positions for force simulation
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

    function applyCollisionAvoidance(nodes) {
        // OPTIMIZATION: Adaptive simulation iterations based on dataset size
        const startTime = performance.now();
        const dataSize = filteredData.length;

        // Fewer iterations for larger datasets to maintain performance
        const iterations = dataSize > 2000 ? 100 : dataSize > 1000 ? 150 : 200;

        console.log(`Running force simulation with ${iterations} iterations for ${dataSize} nodes...`);

        // Simple force simulation with stronger collision avoidance for larger dots
        const simulation = d3.forceSimulation(filteredData)
            .force('collision', d3.forceCollide().radius(d => d.radius + 6).strength(1.4))
            .force('x', d3.forceX(d => xScale(d.group)).strength(0.8))
            .force('y', d3.forceY(d => d.displayY).strength(0.1))
            .alphaDecay(0.05) // OPTIMIZATION: Faster convergence
            .velocityDecay(0.3) // OPTIMIZATION: More friction for faster settling
            .stop();

        // Run simulation until it settles
        for (let i = 0; i < iterations; ++i) {
            simulation.tick();
        }

        // Update node positions
        nodes.attr('cx', d => d.x)
            .attr('cy', d => d.y);

        // Update data with final positions
        filteredData.forEach(d => {
            d.displayX = d.x;
            d.displayY = d.y;
        });

        const endTime = performance.now();
        console.log(`✅ Force simulation complete in ${(endTime - startTime).toFixed(2)}ms`);
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
            .range([6, 12]); // Increased from [3, 5] to [6, 12] for much larger dots

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

        // SVG dropdowns removed - no need to close them
        currentSelection = d;
        currentKeywordSelection = d;

        // Use the long press behavior for all clicks
        svg.selectAll('.connection-line').remove();

        svg.selectAll('.click-indicator, .long-press-indicator').remove();

        svg.selectAll('.node')
            .attr('opacity', 0.1)
            .attr('r', d => d.radius)
            .style('filter', 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.2))');

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

        // Highlight current selected node
        d3.select(targetElement)
            .attr('opacity', 1)
            .attr('r', d => d.radius)
            .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))');

        // OPTIMIZATION: Handle related nodes highlighting using keywordIndex
        const relatedNodeIds = new Set();
        d.keywords.forEach(keyword => {
            const nodesWithKeyword = keywordIndex.get(keyword) || [];
            nodesWithKeyword.forEach(node => {
                if (node.id !== d.id) {
                    relatedNodeIds.add(node.id);
                }
            });
        });

        // OPTIMIZATION: Single pass through nodes instead of forEach with nested selectAll
        if (relatedNodeIds.size > 0) {
            svg.selectAll('.node')
                .each(function (nodeData) {
                    if (relatedNodeIds.has(nodeData.id)) {
                        d3.select(this)
                            .attr('opacity', 1)
                            .attr('r', nodeData.radius)
                            .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))');
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
        <div style="margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
            <div style="margin-bottom: 8px;">
                <div style="color: #FFF; font-family: 'Neue Haas Grotesk Display Pro'; font-size: 18px; font-style: normal; font-weight: 500; line-height: normal; text-transform: uppercase; margin-bottom: 2px;">TITLE</div>
                <div style="color: #FFF; font-family: 'Neue Haas Grotesk Display Pro'; font-size: 35px; font-style: normal; font-weight: 700; line-height: normal;">${articleData ? (articleData.title || 'N/A') : 'N/A'}</div>
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
                const radiusX = 120;  // 水平半径增加
                const radiusY = 180; // 垂直半径增加

                const keywordX = centerX + radiusX * Math.cos(angle);
                const keywordY = centerY + radiusY * Math.sin(angle);

                html += `<line x1="${centerX}" y1="${centerY}" x2="${keywordX}" y2="${keywordY}"
                    stroke="#ddd" stroke-width="1" opacity="0.6"/>`;
            } else {
                // 多层分布
                if (index < 6) {
                    // 内层
                    angle = (index / 6) * 2 * Math.PI - Math.PI / 2;
                    const radiusX = 80;
                    const radiusY = 120;

                    const keywordX = centerX + radiusX * Math.cos(angle);
                    const keywordY = centerY + radiusY * Math.sin(angle);

                    html += `<line x1="${centerX}" y1="${centerY}" x2="${keywordX}" y2="${keywordY}"
                        stroke="#ddd" stroke-width="1" opacity="0.6"/>`;
                } else {
                    // 外层
                    const outerCount = numKeywords - 6;
                    const circleIndex = index - 6;
                    angle = (circleIndex / outerCount) * 2 * Math.PI - Math.PI / 2;
                    const radiusX = 140;
                    const radiusY = 200;

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

        html += `<div style="position: absolute; left: ${centerX - 6}px; top: ${centerY - 6}px;
        width: 12px; height: 12px; background: ${centerColor}; border-radius: 50%;
        border: 2px solid ${borderColor}; box-shadow: 0 0 8px ${shadowColor}; z-index: 2;"></div>`;

        // 🔗 关键词按钮 - 椭圆形竖向分布
        keywords.forEach((keyword, index) => {
            let keywordX, keywordY;

            if (numKeywords <= 8) {
                const angle = (index / numKeywords) * 2 * Math.PI - Math.PI / 2;
                const radiusX = 120;
                const radiusY = 180;

                keywordX = centerX + radiusX * Math.cos(angle);
                keywordY = centerY + radiusY * Math.sin(angle);
            } else {
                if (index < 6) {
                    const angle = (index / 6) * 2 * Math.PI - Math.PI / 2;
                    const radiusX = 80;
                    const radiusY = 120;

                    keywordX = centerX + radiusX * Math.cos(angle);
                    keywordY = centerY + radiusY * Math.sin(angle);
                } else {
                    const outerCount = numKeywords - 6;
                    const circleIndex = index - 6;
                    const angle = (circleIndex / outerCount) * 2 * Math.PI - Math.PI / 2;
                    const radiusX = 140;
                    const radiusY = 200;

                    keywordX = centerX + radiusX * Math.cos(angle);
                    keywordY = centerY + radiusY * Math.sin(angle);
                }
            }

            const displayText = keyword;
            const textLength = displayText.length * 5;
            const rectWidth = Math.max(textLength + 10, 25);

            html += `<div style="position: absolute; left: ${keywordX - rectWidth / 2}px; top: ${keywordY - 8}px;
                background: #000000; border: 1px solid #FFFFFF; border-radius: 15px;
                padding: 4px 16px; color: #FFF; text-align: center;
                font-family: 'Neue Haas Grotesk Display Pro'; font-size: 18px; font-style: normal; font-weight: 500; line-height: normal;
                cursor: pointer; user-select: none; z-index: 3; transition: all 0.2s ease;"
                data-keyword="${keyword}" class="keyword-clickable"
                onmouseover="if(!this.classList.contains('selected')) { this.style.background='#333333'; } this.style.transform='scale(1.05)'"
                onmouseout="if(!this.classList.contains('selected')) { this.style.background='#000000'; } this.style.transform='scale(1)'"
                title="${keyword}">
                ${displayText}
                </div>`;
        });

        html += '</div>';
        panel.innerHTML = html;

        // 🔗 重新绑定关键词点击事件
        panel.querySelectorAll('.keyword-clickable').forEach(element => {
            element.addEventListener('click', function () {
                const keyword = this.getAttribute('data-keyword');
                console.log('🔗 Keyword clicked:', keyword);

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

            element.addEventListener('touchend', function (e) {
                e.preventDefault();
                const keyword = this.getAttribute('data-keyword');
                console.log('🔗 Keyword touched:', keyword);
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

        svg.selectAll('.connection-line').remove();

        // Dim all nodes
        svg.selectAll('.node')
            .attr('opacity', 0.1)
            .attr('r', d => d.radius)
            .style('filter', 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.2))');

        // OPTIMIZATION: Use keywordIndex for O(1) lookup instead of filtering
        const trimmedKeyword = selectedKeyword.trim();
        const nodesWithKeyword = keywordIndex.get(trimmedKeyword) || [];

        console.log(`Found ${nodesWithKeyword.length} nodes with keyword: ${selectedKeyword}`);

        if (nodesWithKeyword.length === 0) {
            console.warn('No nodes found with keyword:', selectedKeyword);
            return;
        }

        // OPTIMIZATION: Limit connection lines for very popular keywords
        const MAX_CONNECTIONS = 500; // Limit total connections to maintain performance
        const keywordThreshold = 50;
        const isHighFrequency = nodesWithKeyword.length > keywordThreshold;
        const lineOpacity = isHighFrequency ? 0.2 : 0.4;
        const lineColor = isHighFrequency ? '#666666' : '#999999';
        const lineWidth = isHighFrequency ? 0.5 : 0.8;

        // Calculate how many connections we'd create
        const totalPossibleConnections = (nodesWithKeyword.length * (nodesWithKeyword.length - 1)) / 2;
        const shouldLimitConnections = totalPossibleConnections > MAX_CONNECTIONS;

        console.log(`Keyword "${selectedKeyword}": ${nodesWithKeyword.length} nodes, ${totalPossibleConnections} possible connections ${shouldLimitConnections ? '(limiting to ' + MAX_CONNECTIONS + ')' : ''}`);

        const connectionLinesGroup = svg.select('.connection-lines');
        let connectionsDrawn = 0;
        const samplingRate = shouldLimitConnections ? MAX_CONNECTIONS / totalPossibleConnections : 1;

        // Draw connection lines (with optional limiting for performance)
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
                    .style('stroke', lineColor)
                    .style('opacity', lineOpacity)
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

        // OPTIMIZATION: Use a Set for O(1) lookup when filtering nodes
        const highlightedNodeIds = new Set(nodesWithKeyword.map(n => n.id));
        if (currentKeywordSelection) {
            highlightedNodeIds.add(currentKeywordSelection.id);
        }

        // OPTIMIZATION: Single selectAll with filter instead of multiple operations
        svg.selectAll('.node')
            .each(function (d) {
                if (highlightedNodeIds.has(d.id)) {
                    d3.select(this)
                        .attr('opacity', 1)
                        .attr('r', d.radius)
                        .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))')
                        .raise();
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

    Object.keys(legendExpanded).forEach(key => {
        legendExpanded[key] = false;
    });

    // SVG dropdown cleanup removed - using HTML dropdowns

    if (svg) {
        console.log('🧹 Cleaning up SVG elements...');

        svg.selectAll('.long-press-indicator, .click-indicator').remove();

        svg.selectAll('.connection-line').remove();

        svg.selectAll('.node')
            .transition()
            .duration(300)
            .attr('opacity', 0.8)
            .attr('r', d => d.radius)
            .style('filter', 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.3))');

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
                e.preventDefault();
                e.stopPropagation();
                console.log('Dropdown item clicked:', type1);
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
