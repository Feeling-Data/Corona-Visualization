let svg, xScale, yScale, colorScale, allData, filteredData;
let currentSelection = null;
let currentKeywordSelection = null;
let legendExpanded = {};
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
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // HTML dropdowns will be initialized after data is loaded

    document.addEventListener('touchstart', function (e) {
        if (!e.target.closest('.scroll-container') &&
            !e.target.closest('svg') &&
            !e.target.classList.contains('node')) {
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchmove', function (e) {
        if (!e.target.closest('.scroll-container')) {
            e.preventDefault();
        }
    }, { passive: false });

    const container = d3.select('.container');

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isPortrait = viewportHeight > viewportWidth;

    const SCREEN_ASPECT_RATIO = 64 / 44;

    let width, height;

    if (isPortrait) {
        width = Math.min(viewportWidth * 0.9, 800);
        height = width * SCREEN_ASPECT_RATIO;

        if (height < viewportHeight * 0.4) {
            height = viewportHeight * 0.5;
            width = height / SCREEN_ASPECT_RATIO;
        }
    } else {
        const viewportAspectRatio = viewportWidth / viewportHeight;

        if (viewportAspectRatio > SCREEN_ASPECT_RATIO) {
            height = viewportHeight;
            width = height * SCREEN_ASPECT_RATIO;
        } else {
            width = viewportWidth;
            height = width / SCREEN_ASPECT_RATIO;
        }
    }

    height = Math.max(height, viewportHeight * 2);

    const margin = {
        top: isPortrait ? 40 : 60,
        right: isPortrait ? Math.max(width / 10, 40) : width / 6,
        bottom: 120,
        left: isPortrait ? 10 : 20
    };

    const actualWidth = width + (isPortrait ? 150 : 400);
    const actualHeight = height + 500;

    svg = container.append('svg')
        .attr('width', actualWidth)
        .attr('height', actualHeight)
        .attr('viewBox', isPortrait ?
            `0 0 ${actualWidth} ${actualHeight}` :
            `0 0 ${actualWidth} ${actualHeight}`)
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

    let maxScrollY = 0;

    function setupScrollLimits() {
        setTimeout(() => {
            if (yScale && yScale.customPositions) {
                const lastPosition = yScale.customPositions[yScale.customPositions.length - 1];
                const yAxisBottom = lastPosition.y + lastPosition.height;

                maxScrollY = Math.max(yAxisBottom - window.innerHeight + 200, 0);

                console.log('Scroll limits set:', {
                    yAxisBottom: yAxisBottom,
                    maxScrollY: maxScrollY,
                    windowHeight: window.innerHeight
                });

                const scrollContainer = document.querySelector('.scroll-container');
                if (scrollContainer) {
                    const newHeight = yAxisBottom + 500;
                    scrollContainer.style.height = newHeight + 'px';
                }
            }
        }, 1000);
    }

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
                'date of collection': randomDate.toISOString().split('T')[0],
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
            const dateString = d['date of collection'];
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
            const dateString = d['date of collection'];
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

            d.keywords = d.keywords ? d.keywords.toLowerCase().split(',').map(k => k.trim()).filter(k => k.length > 0) : [];

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
        allData = filteredData;

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

        const monthDensity = d3.rollup(filteredData, v => v.length, d => d3.timeMonth(d.parsedDate));

        const customYPositions = [];
        const startDate = actualTimeExtent[0];
        const endDate = actualTimeExtent[1];

        let currentY = margin.top + 20;
        const baseMonthHeight = 60;

        console.log('Y axis will cover:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);

        const compressStart = new Date(2020, 4, 1);
        const compressEnd = new Date(2021, 10, 30);

        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const monthKey = d3.timeMonth(currentDate);
            const density = monthDensity.get(monthKey) || 0;
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();

            let monthHeight = baseMonthHeight;

            if (density > 200) {
                monthHeight = baseMonthHeight * 3;
            } else if (density > 100) {
                monthHeight = baseMonthHeight * 2;
            } else if (density > 50) {
                monthHeight = baseMonthHeight * 1.5;
            }

            if (year === 2020 && month === 2) {
                monthHeight *= 3;
            } else if (year === 2020 && month === 3) {
                monthHeight *= 1.5;
            }

            if (currentDate >= compressStart) {
                monthHeight *= (0.4);
                console.log(`Compressing ${year}-${String(month + 1).padStart(2, '0')}: height reduced to ${monthHeight}`);
            }

            customYPositions.push({
                date: new Date(currentDate),
                yStart: currentY,
                yEnd: currentY + monthHeight,
                height: monthHeight,
                density: density
            });

            console.log(`${year}-${String(month + 1).padStart(2, '0')}: start=${currentY}, end=${currentY + monthHeight}, height=${monthHeight}`);

            currentY += monthHeight;
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        console.log('Total Y axis height:', currentY);

        yScale = d3.scaleTime()
            .domain([startDate, endDate])
            .range([margin.top + 20, currentY - baseMonthHeight]);

        const firstDataDate = d3.min(filteredData, d => d.parsedDate);
        const firstMonthInfo = customYPositions.find(pos =>
            d3.timeMonth(pos.date).getTime() === d3.timeMonth(firstDataDate).getTime()
        );

        let SELECTIVE_MOVE_UP = 0;
        if (firstMonthInfo) {
            const targetPosition = margin.top - 90;
            SELECTIVE_MOVE_UP = firstMonthInfo.yStart - targetPosition;
        }

        window.selectiveMoveUp = SELECTIVE_MOVE_UP;
        window.dataTargetPosition = margin.top - 90;

        let assignedCount = 0;
        let fallbackCount = 0;

        filteredData.forEach(d => {
            const monthKey = d3.timeMonth(d.parsedDate);
            const monthInfo = customYPositions.find(pos =>
                d3.timeMonth(pos.date).getTime() === monthKey.getTime()
            );

            if (monthInfo) {
                const monthStart = monthKey;
                const monthEnd = d3.timeMonth.offset(monthKey, 1);
                const monthProgress = (d.parsedDate - monthStart) / (monthEnd - monthStart);

                const baseY = monthInfo.yStart + monthInfo.height * 0.1 + monthProgress * monthInfo.height * 0.8;
                const variation = (Math.random() - 0.5) * monthInfo.height * 0.15;

                d.adjustedY = baseY + variation - SELECTIVE_MOVE_UP;
                assignedCount++;
            } else {
                d.adjustedY = yScale(d.parsedDate) - SELECTIVE_MOVE_UP;
                fallbackCount++;
                console.warn('No month info found for', d.parsedDate.toISOString().split('T')[0]);
            }
        });

        console.log('Y position assignment:', assignedCount, 'custom,', fallbackCount, 'fallback');

        yScale.customPositions = customYPositions.map(pos => ({
            ...pos,
            originalYStart: pos.yStart,
            yStart: pos.yStart - SELECTIVE_MOVE_UP + (pos.date >= new Date(2020, 3, 1) ? -80 : 100),
            yEnd: pos.yEnd - SELECTIVE_MOVE_UP + (pos.date >= new Date(2020, 3, 1) ? -80 : 100)
        }));

        const availableWidth = width * 0.45;
        const visualizationStart = isPortrait ? 150 : 80;

        xScale = d3.scalePoint()
            .domain(groupOrder)
            .range([visualizationStart, visualizationStart + availableWidth])
            .padding(0.1);

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
        setupScrollLimits();

        const firstDataDate = d3.min(filteredData, d => d.parsedDate);
        const firstMonthInfo = yScale.customPositions.find(pos =>
            d3.timeMonth(pos.date).getTime() === d3.timeMonth(firstDataDate).getTime()
        );

        if (firstMonthInfo) {
            const targetY = margin.top + 40;
            const moveUpDistance = firstMonthInfo.yStart - targetY;

            console.log(`Moving visualization up by ${moveUpDistance}px`);

            const visualizationGroup = svg.append('g')
                .attr('class', 'visualization-group')
                .attr('transform', `translate(0, ${-moveUpDistance})`);

            svg.selectAll('.node').each(function () {
                visualizationGroup.node().appendChild(this);
            });

            svg.selectAll('.connection-lines').each(function () {
                visualizationGroup.node().appendChild(this);
            });

            svg.selectAll('.node').attr('cy', d => d.displayY);
        }

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

        nodesWithType1.forEach(node => {
            svg.selectAll('.node')
                .filter(d => d.id === node.id)
                .attr('opacity', 1)
                .attr('r', d => d.radius * 1.2)
                .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))');
        });

        if (currentKeywordSelection) {
            svg.selectAll('.node')
                .filter(d => d.id === currentKeywordSelection.id)
                .attr('opacity', 1)
                .attr('r', d => d.radius)
                .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))');
        }

        console.log(`Highlighted ${nodesWithType1.length} nodes for type1: ${selectedType1}`);
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
                const xOffset = (Math.random() - 0.5) * groupWidth;
                d.displayX = Math.max(50, Math.min(width - 50, groupX + xOffset));

                const EARLY_MOVE_UP = 60;
                const LATE_MOVE_UP = 60;

                if (d.parsedDate >= new Date(2020, 3, 1)) {
                    d.displayY = d.adjustedY - 90 - LATE_MOVE_UP;
                } else {
                    d.displayY = d.adjustedY - EARLY_MOVE_UP;
                }

                d.displayY = Math.max(margin.top - 100, Math.min(height - margin.bottom + 100, d.displayY));
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

    function setupFloatingPanelScrollBehavior() {
        let maxScrollY = 0;
        let yAxisBottom = 0;

        function calculateLimits() {
            if (yScale && yScale.customPositions) {
                const lastPosition = yScale.customPositions[yScale.customPositions.length - 1];
                yAxisBottom = lastPosition.y + lastPosition.height;
                maxScrollY = Math.max(yAxisBottom - window.innerHeight + 200, 0);
            }
        }

        function handleScroll() {
            const scrollY = window.scrollY;
            const keywordPanel = document.getElementById('keyword-panel');
            const contentPanel = document.getElementById('content-panel');

            if (scrollY > maxScrollY) {
                window.scrollTo(0, maxScrollY);
                return;
            }

            const viewportHeight = window.innerHeight;
            const panelMaxTop = yAxisBottom - 100;

            if (keywordPanel && keywordPanel.style.display === 'block') {
                const keywordPanelHeight = keywordPanel.offsetHeight;
                let keywordTop = 100 + scrollY;

                keywordTop = Math.min(keywordTop, panelMaxTop - keywordPanelHeight);
                keywordTop = Math.max(keywordTop, scrollY + 20);

                keywordPanel.style.top = keywordTop + 'px';

                if (contentPanel && contentPanel.style.display === 'block') {
                    let contentTop = keywordTop + keywordPanelHeight + 10;
                    const contentPanelHeight = contentPanel.offsetHeight;

                    contentTop = Math.min(contentTop, panelMaxTop - contentPanelHeight);

                    contentPanel.style.top = contentTop + 'px';
                }
            } else if (contentPanel && contentPanel.style.display === 'block') {
                const contentPanelHeight = contentPanel.offsetHeight;
                let contentTop = 100 + scrollY;

                contentTop = Math.min(contentTop, panelMaxTop - contentPanelHeight);
                contentTop = Math.max(contentTop, scrollY + 20);

                contentPanel.style.top = contentTop + 'px';
            }
        }

        let scrollTimeout;
        function throttledScroll() {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            scrollTimeout = setTimeout(() => {
                calculateLimits();
                handleScroll();
            }, 10);
        }

        window.addEventListener('scroll', throttledScroll);

        setTimeout(calculateLimits, 1500);
    }

    function applyCollisionAvoidance(nodes) {
        const simulation = d3.forceSimulation(filteredData)
            .force('collision', d3.forceCollide().radius(d => d.radius + 3).strength(0.8))
            .force('x', d3.forceX(d => d.displayX).strength(0.3))
            .force('y', d3.forceY(d => d.displayY).strength(0.1))
            .alphaDecay(0.05)
            .velocityDecay(0.4);

        simulation.on('tick', () => {
            filteredData.forEach(d => {
                const groupX = xScale(d.group);
                const groupWidth = 120;

                d.x = Math.max(groupX - groupWidth / 2,
                    Math.min(groupX + groupWidth / 2, d.x));

                d.y = Math.max(margin.top + 20,
                    Math.min(height - margin.bottom - 20, d.y));
            });

            nodes.attr('cx', d => d.x)
                .attr('cy', d => d.y);
        });

        simulation.on('end', () => {
            filteredData.forEach(d => {
                d.displayX = d.x;
                d.displayY = d.y;
            });
        });
    }

    function createConnectionLines() {
        const connectionLinesGroup = svg.append('g')
            .attr('class', 'connection-lines');

        const keywordConnections = {};

        const allKeywords = new Set();
        filteredData.forEach(d => {
            d.keywords.forEach(keyword => allKeywords.add(keyword));
        });

        allKeywords.forEach(keyword => {
            const nodesWithKeyword = filteredData.filter(d => d.keywords.includes(keyword));

            for (let i = 0; i < nodesWithKeyword.length; i++) {
                for (let j = i + 1; j < nodesWithKeyword.length; j++) {
                    const node1 = nodesWithKeyword[i];
                    const node2 = nodesWithKeyword[j];

                    const midX = (node1.displayX + node2.displayX) / 2;
                    const midY = (node1.displayY + node2.displayY) / 2;
                    const distance = Math.sqrt(Math.pow(node2.displayX - node1.displayX, 2) + Math.pow(node2.displayY - node1.displayY, 2));

                    const offsetX = -(node2.displayY - node1.displayY) * 0.1;
                    const offsetY = (node2.displayX - node1.displayX) * 0.1;

                    const path = `M ${node1.x || node1.displayX} ${node1.y || node1.displayY} Q ${midX + offsetX} ${midY + offsetY} ${node2.x || node2.displayX} ${node2.y || node2.displayY}`;

                    connectionLinesGroup.append('path')
                        .attr('d', path)
                        .attr('class', 'connection-line')
                        .attr('data-keyword', keyword)
                        .attr('data-nodes', `${node1.id}-${node2.id}`)
                        .style('display', 'block');
                }
            }
        });
    }

    function setupDynamicSizesWithSqrt() {
        const keywordExtent = d3.extent(filteredData, d => d.keywords.length);

        const sizeScale = d3.scaleSqrt()
            .domain(keywordExtent)
            .range([3, 5]);

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
        const nodeX = parseFloat(targetElement.getAttribute('cx'));
        const nodeY = parseFloat(targetElement.getAttribute('cy'));
        const nodeRadius = parseFloat(targetElement.getAttribute('r'));

        const offsetX = 0;
        const offsetY = 30;
        const circleRadius = nodeRadius + 6;

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

        // Handle related nodes highlighting
        const relatedNodes = [];
        d.keywords.forEach(keyword => {
            const nodesWithKeyword = filteredData.filter(node =>
                node.id !== d.id && node.keywords.includes(keyword)
            );

            nodesWithKeyword.forEach(node => {
                if (!relatedNodes.find(n => n.id === node.id)) {
                    relatedNodes.push(node);
                }
            });
        });

        relatedNodes.forEach(node => {
            svg.selectAll('.node')
                .filter(nodeData => nodeData.id === node.id)
                .attr('opacity', 1)
                .attr('r', d => d.radius)
                .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))');
        });

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

        if (keywords.length === 0) {
            panel.innerHTML = '<h3>Keywords:</h3><p style="color: #666;">No keywords available</p>';
            return;
        }

        // Get the current selection data for article info
        const articleData = currentSelection || currentKeywordSelection;

        // 🔗 竖向辐射设计 - 窄而高
        panel.style.width = '280px';  // Increased width to accommodate article info
        const keywordWidth = 320;
        const keywordHeight = 300;

        // Article information section
        const dateStr = articleData && articleData.isGeneratedDate ? 'Unknown (Generated)' :
            (articleData && articleData.parsedDate ? articleData.parsedDate.toLocaleDateString() : 'N/A');

        let html = `
        <div style="margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
            <div style="margin-bottom: 8px;">
                <div style="color: #bbb; font-size: 10px; text-transform: uppercase; margin-bottom: 2px;">TITLE</div>
                <div style="color: #ffffff; font-size: 14px; font-weight: bold; line-height: 1.3;">${articleData ? (articleData.title || 'N/A') : 'N/A'}</div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                <div style="flex: 1;">
                    <div style="color: #bbb; font-size: 10px; text-transform: uppercase; margin-bottom: 2px;">DATE</div>
                    <div style="color: #ffffff; font-size: 12px; font-weight: bold; border-bottom: 1px solid #fff; display: inline-block; padding-bottom: 1px;">${dateStr}</div>
                </div>
                <div style="flex: 1; margin-left: 15px;">
                    <div style="color: #bbb; font-size: 10px; text-transform: uppercase; margin-bottom: 2px;">TYPE</div>
                    <div style="color: #ffffff; font-size: 12px; font-weight: bold; border-bottom: 1px solid #fff; display: inline-block; padding-bottom: 1px;">${articleData ? (articleData.type1 || 'N/A') : 'N/A'}</div>
                </div>
            </div>
        </div>
        <div style="margin-bottom: 10px;">
            <div style="color: #ffffff; font-size: 12px;">${keywords.length} KEYWORDS</div>
        </div>
    `;
        html += `<div style="position: relative; width: ${keywordWidth}px; height: ${keywordHeight}px; margin: 10px 0;">`;

        const centerX = keywordWidth / 2 - 40;
        const centerY = keywordHeight / 2;

        // 🔗 SVG连接线 - 从中心辐射到关键词
        html += `<svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;">`;

        const numKeywords = keywords.length;
        keywords.forEach((keyword, index) => {
            let angle, radius;

            if (numKeywords <= 8) {
                // 单层椭圆分布，偏向竖直
                angle = (index / numKeywords) * 2 * Math.PI - Math.PI / 2;
                const radiusX = 60;  // 水平半径较小
                const radiusY = 100; // 垂直半径较大

                const keywordX = centerX + radiusX * Math.cos(angle);
                const keywordY = centerY + radiusY * Math.sin(angle);

                html += `<line x1="${centerX}" y1="${centerY}" x2="${keywordX}" y2="${keywordY}"
                    stroke="#ddd" stroke-width="1" opacity="0.6"/>`;
            } else {
                // 多层分布
                if (index < 6) {
                    // 内层
                    angle = (index / 6) * 2 * Math.PI - Math.PI / 2;
                    const radiusX = 40;
                    const radiusY = 70;

                    const keywordX = centerX + radiusX * Math.cos(angle);
                    const keywordY = centerY + radiusY * Math.sin(angle);

                    html += `<line x1="${centerX}" y1="${centerY}" x2="${keywordX}" y2="${keywordY}"
                        stroke="#ddd" stroke-width="1" opacity="0.6"/>`;
                } else {
                    // 外层
                    const outerCount = numKeywords - 6;
                    const circleIndex = index - 6;
                    angle = (circleIndex / outerCount) * 2 * Math.PI - Math.PI / 2;
                    const radiusX = 70;
                    const radiusY = 120;

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
                const radiusX = 60;
                const radiusY = 100;

                keywordX = centerX + radiusX * Math.cos(angle);
                keywordY = centerY + radiusY * Math.sin(angle);
            } else {
                if (index < 6) {
                    const angle = (index / 6) * 2 * Math.PI - Math.PI / 2;
                    const radiusX = 40;
                    const radiusY = 70;

                    keywordX = centerX + radiusX * Math.cos(angle);
                    keywordY = centerY + radiusY * Math.sin(angle);
                } else {
                    const outerCount = numKeywords - 6;
                    const circleIndex = index - 6;
                    const angle = (circleIndex / outerCount) * 2 * Math.PI - Math.PI / 2;
                    const radiusX = 70;
                    const radiusY = 120;

                    keywordX = centerX + radiusX * Math.cos(angle);
                    keywordY = centerY + radiusY * Math.sin(angle);
                }
            }

            const displayText = keyword;
            const textLength = displayText.length * 5;
            const rectWidth = Math.max(textLength + 10, 25);

            html += `<div style="position: absolute; left: ${keywordX - rectWidth / 2}px; top: ${keywordY - 8}px;
                background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px;
                padding: 2px 6px; font-size: 9px; color: #333; text-align: center;
                cursor: pointer; user-select: none; z-index: 3; transition: all 0.2s ease;"
                data-keyword="${keyword}" class="keyword-clickable"
                onmouseover="this.style.background='#e9ecef'; this.style.transform='scale(1.05)'"
                onmouseout="this.style.background='#f8f9fa'; this.style.transform='scale(1)'"
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

        if (!svg || !filteredData) {
            console.error('SVG or filteredData not available');
            return;
        }

        svg.selectAll('.connection-line').remove();

        // 让所有节点变暗
        svg.selectAll('.node')
            .attr('opacity', 0.1)
            .attr('r', d => d.radius)
            .style('filter', 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.2))');

        const nodesWithKeyword = filteredData.filter(d =>
            d.keywords && d.keywords.includes(selectedKeyword.trim())
        );

        console.log(`Found ${nodesWithKeyword.length} nodes with keyword: ${selectedKeyword}`);

        if (nodesWithKeyword.length === 0) {
            console.warn('No nodes found with keyword:', selectedKeyword);
            return;
        }

        const keywordThreshold = 50;
        const isHighFrequency = nodesWithKeyword.length > keywordThreshold;
        const lineOpacity = isHighFrequency ? 0.2 : 0.4;
        const lineColor = isHighFrequency ? '#666666' : '#999999';
        const lineWidth = isHighFrequency ? 0.5 : 0.8;

        console.log(`关键词"${selectedKeyword}"出现${nodesWithKeyword.length}次，${isHighFrequency ? '降低饱和度' : '正常饱和度'}`);

        const connectionLinesGroup = svg.select('.connection-lines');

        for (let i = 0; i < nodesWithKeyword.length; i++) {
            for (let j = i + 1; j < nodesWithKeyword.length; j++) {
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
            }
        }

        const allNodes = svg.selectAll('.node');
        const connectionLines = svg.selectAll('.connection-line');
        const longPressIndicator = svg.selectAll('.long-press-indicator');

        connectionLines.raise();

        svg.selectAll('.node')
            .filter(function (d) {
                return nodesWithKeyword.some(node => node.id === d.id) ||
                    (currentKeywordSelection && d.id === currentKeywordSelection.id);
            })
            .raise();

        longPressIndicator.raise();

        nodesWithKeyword.forEach(node => {
            svg.selectAll('.node')
                .filter(d => d.id === node.id)
                .attr('opacity', 1)
                .attr('r', d => d.radius)
                .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))');
        });

        if (currentKeywordSelection) {
            svg.selectAll('.node')
                .filter(d => d.id === currentKeywordSelection.id)
                .attr('opacity', 1)
                .attr('r', d => d.radius)
                .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))');
        }

        console.log(`✅ 连接线图层顺序已优化: ${nodesWithKeyword.length} 个节点，${isHighFrequency ? '低饱和度' : '正常饱和度'}连接线`);
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


    console.log('✅ COMPLETE RESET FINISHED - 所有状态已恢复默认！');
}

function setupFloatingPanelScrollBehavior() {
    let maxScrollY = 0;
    let yAxisBottom = 0;

    function calculateLimits() {
        if (yScale && yScale.customPositions) {
            const lastPosition = yScale.customPositions[yScale.customPositions.length - 1];
            yAxisBottom = lastPosition.y + lastPosition.height;
            maxScrollY = Math.max(yAxisBottom - window.innerHeight + 200, 0);
        }
    }

    function handleScroll() {
        const scrollY = window.scrollY;
        const keywordPanel = document.getElementById('keyword-panel');

        if (scrollY > maxScrollY) {
            window.scrollTo(0, maxScrollY);
            return;
        }

        const panelMaxTop = yAxisBottom - 100;

        if (keywordPanel && keywordPanel.style.display === 'block') {
            const keywordPanelHeight = keywordPanel.offsetHeight;
            let keywordTop = 100 + scrollY;

            keywordTop = Math.min(keywordTop, panelMaxTop - keywordPanelHeight);
            keywordTop = Math.max(keywordTop, scrollY + 20);

            keywordPanel.style.top = keywordTop + 'px';
        }
    }

    let scrollTimeout;
    function throttledScroll() {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(() => {
            calculateLimits();
            handleScroll();
        }, 10);
    }

    window.addEventListener('scroll', throttledScroll);
    setTimeout(calculateLimits, 1500);
}

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
