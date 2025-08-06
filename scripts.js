let svg, xScale, yScale, colorScale, allData, filteredData;
let currentSelection = null;
let currentKeywordSelection = null;
let legendExpanded = {};
let longPressTimer = null;
let isLongPressing = false;

const type1GroupMap = {
    // Culture
    'Arts': 'Culture',
    'Theatre': 'Culture',
    'Comedy': 'Culture',
    'Film and Cinema': 'Culture',
    'Festival': 'Culture',
    'Music': 'Culture',
    'Culture': 'Culture',
    // Media
    'Sports': 'Media',
    'News': 'Media',
    'Media': 'Media',
    'Blog': 'Media',
    'History': 'Media',
    'Heritage': 'Media',
    'Heritage and Tourism': 'Media',
    // Government
    'Government': 'Government',
    'Local Authority': 'Government',
    //'Scottish Government and Parliament': 'Government',
    'Parliament': 'Government',
    'Executive NDPB': 'Government',
    'Agency': 'Government',
    'Public Corporations': 'Government',
    'Politics': 'Government',
    'Law': 'Government',
    // Knowledge
    'Health': 'Knowledge',
    'Health and Social Care': 'Knowledge',
    'Support': 'Knowledge',
    'Education': 'Knowledge',
    'School': 'Knowledge',
    'School, Primary': 'Knowledge',
    'School, Secondary': 'Knowledge',
    'School, ASL': 'Knowledge',
    'School, Independent': 'Knowledge',
    'Libraries and Archives': 'Knowledge',
    'Research': 'Knowledge',
    'Science': 'Knowledge',
    // Society
    'Business': 'Society',
    'Retail': 'Society',
    'Food and Drink': 'Society',
    'Oil': 'Society',
    'Timber': 'Society',
    'Utilities': 'Society',
    'Transport': 'Society',
    'Voluntary': 'Society',
    'Charity': 'Society',
    'Community': 'Society',
    'Think Tank': 'Society',
    'Nature': 'Society',
    'Wildlife': 'Society',
    'Church and religion': 'Society',
    'Religion': 'Society'
};

const groupOrder = [
    'Media',
    'Government', 
    'Culture',
    'Knowledge',
    'Society'
];

const SCREEN_ASPECT_RATIO = 64 / 44;

document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('touchstart', function(e) {
        if (!e.target.closest('.scroll-container')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.addEventListener('touchmove', function(e) {
        if (!e.target.closest('.scroll-container')) {
            e.preventDefault();
        }
    }, { passive: false });

    const container = d3.select('.container');
    
    // Set dimensions based on touch screen aspect ratio
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportAspectRatio = viewportWidth / viewportHeight;
    
    let width, height;
    if (viewportAspectRatio > SCREEN_ASPECT_RATIO) {
        // Viewport is wider than screen ratio, fit to height
        height = viewportHeight;
        width = height * SCREEN_ASPECT_RATIO;
    } else {
        // Viewport is taller than screen ratio, fit to width
        width = viewportWidth;
        height = width / SCREEN_ASPECT_RATIO;
    }
    
    height = Math.max(viewportHeight * 3, 2000);
    const margin = { top: 20, right: width / 6, bottom: 120, left: 80 };

    // Create SVG
    const actualWidth = width + 400;
    const actualHeight = height + 500;
    svg = container.append('svg')
        .attr('width', actualWidth)
        .attr('height', actualHeight)
        .attr('viewBox', [-300, -150, actualWidth, actualHeight])
        .style('background', '#101420')
        .style('margin', '0 auto')
        .style('display', 'block');

    // Create category panel (top 1/3 of right panel)
    const categoryPanel = svg.append('g')
        .attr('class', 'category-panel')
        .attr('transform', `translate(${margin.left - 280}, ${margin.top+40})`);

    // Show loading message
    const loadingText = svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('class', 'status-message')
        .text("Loading data...");

    svg.on('click touchend', function (event) {
        event.preventDefault();
        
        const isNode = event.target.classList.contains('node');
        const isLegend = event.target.closest('.legend');
        const isPanel = event.target.closest('.content-panel') || 
                        event.target.closest('.keyword-panel');

        if (!isNode && !isLegend && !isPanel) {
            resetVisualization();
        }
    });

    // Load and process data
    loadData();

    let maxScrollY = 0;

    function setupScrollLimits() {
        setTimeout(() => {
            if (yScale && yScale.customPositions) {
                // 获取Y轴最低点位置
                const lastPosition = yScale.customPositions[yScale.customPositions.length - 1];
                const yAxisBottom = lastPosition.y + lastPosition.height;
                
                // 设置最大滚动距离：Y轴底部 + 一些缓冲
                maxScrollY = Math.max(yAxisBottom - window.innerHeight + 200, 0);
                
                console.log('Scroll limits set:', {
                    yAxisBottom: yAxisBottom,
                    maxScrollY: maxScrollY,
                    windowHeight: window.innerHeight
                });
                
                // 限制滚动容器的高度
                const scrollContainer = document.querySelector('.scroll-container');
                if (scrollContainer) {
                    const newHeight = yAxisBottom + 500; 
                    scrollContainer.style.height = newHeight + 'px';
                }
            }
        }, 1000); 
    }

    function loadData() {
        // Load your CSV file - replace with actual file path
        d3.csv('data.csv').then(function(rawData) {
            processData(rawData);
        }).catch(function(error) {
            console.error("Error loading data:", error);
            // Use sample data for demonstration if CSV fails
            console.log("Using sample data for demonstration");
            const sampleData = generateSampleData();
            processData(sampleData);
        });
    }

    function generateSampleData() {
        // Generate sample data for demonstration with mapped types
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
        
        // 清理日期字符串
        const cleaned = dateString.trim().toLowerCase();
        
        // 处理"unknown"和各种无效值
        if (cleaned === 'unknown' || cleaned === '' || cleaned === 'n/a' || 
            cleaned === 'na' || cleaned === 'null' || cleaned === 'undefined') {
            return 'unknown';
        }
        
        // 匹配英国格式：DD/MM/YYYY 或 DD-MM-YYYY
        const ukDatePattern = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
        const match = cleaned.match(ukDatePattern);
        
        if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const year = parseInt(match[3], 10);
            
            // 验证日期有效性
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2030) {
                const date = new Date(year, month - 1, day);
                
                // 验证日期是否有效
                if (date.getFullYear() === year && 
                    date.getMonth() === month - 1 && 
                    date.getDate() === day) {
                    return date;
                }
            }
        }
        
        return null;
    }

    // 新增：在日期范围内生成随机日期
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

        // Filter for coronavirus data
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

        // 如果没有有效日期，使用默认日期范围
        let minDate, maxDate;
        if (validDates.length > 0) {
            minDate = new Date(Math.min(...validDates));
            maxDate = new Date(Math.max(...validDates));
        } else {
            // 默认日期范围：2020年1月1日到2024年12月31日
            minDate = new Date(2020, 0, 1);
            maxDate = new Date(2024, 11, 31);
        }

        console.log('Date range:', minDate.toISOString().split('T')[0], 'to', maxDate.toISOString().split('T')[0]);

        let generatedDateCount = 0;
        filtered.forEach((d, index) => {
            const dateString = d['date of collection'];
            const parsedDate = parseUKDate(dateString);
            
            if (parsedDate && parsedDate !== 'unknown') {
                d.parsedDate = parsedDate;
                d.isGeneratedDate = false;
            } else {
                // 为unknown或无效日期生成随机日期
                d.parsedDate = generateRandomDate(minDate, maxDate);
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

        // 现在所有记录都有有效日期
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
    }

    function setupScales() {
        const actualTimeExtent = d3.extent(filteredData, d => d.parsedDate);
        console.log('📅 Actual data date range:', 
            actualTimeExtent[0].toISOString().split('T')[0], 
            'to', 
            actualTimeExtent[1].toISOString().split('T')[0]
        );
        
        const monthDensity = d3.rollup(filteredData, v => v.length, d => d3.timeMonth(d.parsedDate));
        
        const customYPositions = [];
        const startDate = new Date(Math.min(actualTimeExtent[0], new Date(2020, 2, 1)));
        const endDate = actualTimeExtent[1];
        
        let currentY = margin.top + 20;
        const baseMonthHeight = 60;
        
        console.log('Y axis will cover:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
        
        const compressStart = new Date(2020, 6, 1); // 2020年7月
        const compressEnd = new Date(2021, 10, 30); // 2021年11月
        
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const monthKey = d3.timeMonth(currentDate);
            const density = monthDensity.get(monthKey) || 0;
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            let monthHeight = baseMonthHeight;
            
            // 根据数据密度调整
            if (density > 200) {
                monthHeight = baseMonthHeight * 3;
            } else if (density > 100) {
                monthHeight = baseMonthHeight * 2;
            } else if (density > 50) {
                monthHeight = baseMonthHeight * 1.5;
            }
            
            // 特定月份调整
            if (year === 2020 && month === 2) {
                monthHeight *= 2; // 2020年3月
            } else if (year === 2020 && month === 3) {
                monthHeight *= 1.5; // 2020年4月
            }
            
            // 压缩2020-07到2021-11的时间段
            if (currentDate >= compressStart && currentDate <= compressEnd) {
                monthHeight *= 0.5; // 压缩到二分之一
                console.log(`🗜️ Compressing ${year}-${String(month+1).padStart(2,'0')}: height reduced to ${monthHeight}`);
            } else if (year > 2021 || (year === 2021 && month > 10)) {
                monthHeight *= 0.8;
            }
            
            customYPositions.push({
                date: new Date(currentDate),
                yStart: currentY,        
                yEnd: currentY + monthHeight,  
                height: monthHeight,
                density: density
            });
            
            console.log(`📍 ${year}-${String(month+1).padStart(2,'0')}: start=${currentY}, end=${currentY + monthHeight}, height=${monthHeight}`);
            
            currentY += monthHeight;
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        console.log('📏 Total Y axis height:', currentY);
        
        yScale = d3.scaleTime()
            .domain([startDate, endDate])
            .range([margin.top + 20, currentY - baseMonthHeight]);
        
        // 为每个数据点分配Y位置
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
                
                // 数据点分布在整个月份空间内，略微避开顶部刻度
                const baseY = monthInfo.yStart + monthInfo.height * 0.1 + monthProgress * monthInfo.height * 0.8;
                const variation = (Math.random() - 0.5) * monthInfo.height * 0.15;
                d.adjustedY = baseY + variation;
                assignedCount++;
            } else {
                d.adjustedY = yScale(d.parsedDate);
                fallbackCount++;
                console.warn('⚠️ No month info found for', d.parsedDate.toISOString().split('T')[0]);
            }
        });
        
        console.log('✅ Y position assignment:', assignedCount, 'custom,', fallbackCount, 'fallback');
        
        yScale.customPositions = customYPositions;

        // X scale 和 color scale 保持不变
        const availableWidth = width * 0.5;
        const visualizationStart = 80;
        xScale = d3.scalePoint()
            .domain(groupOrder)
            .range([visualizationStart, visualizationStart + availableWidth])
            .padding(0);

        colorScale = d3.scaleOrdinal()
            .domain(groupOrder)
            .range([
            '#7db3e8',  // Media - 薄雾蓝
            '#e8d4a6',  // Government - 香槟金  
            '#c8b5e0',  // Culture - 薰衣草紫
            '#9dd9b8',  // Knowledge - 晨露绿
            '#e8b8b8'   // Society - 玫瑰金
        ]);

        filteredData.forEach(d => {
            d.radius = d.keywords.length > 15 ? 5 : 3;
        });
    }

    function createVisualization() {
        createAxes();
        createConnectionLines();
        createNodes();
        createLegend();
        setupScrollLimits();
    }

    function createAxes() {
        const customTicks = [];
        const customTickPositions = [];
        
        // 从yScale.customPositions获取月份位置信息
        yScale.customPositions.forEach((monthInfo, index) => {
            const isYearStart = monthInfo.date.getMonth() === 0;
            const is2020April = monthInfo.date.getFullYear() === 2020 && monthInfo.date.getMonth() === 3;
            const shouldShow = index % 2 === 0 || isYearStart || is2020April;
            
            if (shouldShow) {
                customTicks.push(monthInfo.date);
                // ⭐ 刻度显示在月份的开始位置（顶部）
                customTickPositions.push(monthInfo.yStart - 10);
            }
        });
        
        console.log('📊 Y axis ticks:', customTicks.map(d => d.toISOString().split('T')[0]));
        console.log('📊 Y axis positions:', customTickPositions);
        
        const yAxisGroup = svg.append('g')
            .attr('class', 'axis y-axis')
            .attr('transform', `translate(-10,0)`); 

        // 手动创建刻度线和标签
        customTicks.forEach((date, index) => {
            const yPos = customTickPositions[index];
            
            // 刻度线
            yAxisGroup.append('line')
                .attr('x1', -6)
                .attr('x2', 0)
                .attr('y1', yPos)
                .attr('y2', yPos)
                .style('stroke', '#ffffff')
                .style('stroke-width', 1);
            
            // 刻度标签
            yAxisGroup.append('text')
                .attr('x', -9)
                .attr('y', yPos)
                .attr('dy', '0.35em')
                .style('text-anchor', 'end')
                .style('fill', '#ffffff')
                .style('font-size', '15px')
                .style('font-family', 'Cormorant Garamond, serif')
                .text(d3.timeFormat('%Y-%m')(date));
        });

        // Y轴主线已移除，保持简洁外观
        const yAxisStart = yScale.customPositions[0].yStart;
        const yAxisEnd = yScale.customPositions[yScale.customPositions.length - 1].yEnd;
        
        console.log('📐 Y axis range from', yAxisStart, 'to', yAxisEnd);
        
        // 确保所有Y轴元素的样式
        svg.select('.y-axis')
            .selectAll('line, path')
            .style('stroke', '#ffffff');

        // X轴 - 组标签
        svg.selectAll('.group-label')
            .data(groupOrder)
            .enter()        
            .append('text')
            .attr('class', 'group-label')
            .attr('x', d => xScale(d))
            .attr('y', margin.top - 5)
            .text(d => d)
            .style('text-anchor', 'middle')
            .style('font-weight', 'bold')
            .style('font-size', '15px')
            .style('fill', '#ffffff')
            .style('font-family', 'Cormorant Garamond, serif')
            .each(function(d) {
                const text = d3.select(this);
                const words = d.split(' ');
                if (words.length > 2) {
                    text.text('');
                    words.forEach((word, i) => {
                        text.append('tspan')
                            .attr('x', xScale(d))
                            .attr('dy', i === 0 ? 0 : '-1.2em')
                            .text(word);
                    });
                }
            });

    }

    function createNodes() {
        // Group data by group
        const groupedData = d3.group(filteredData, d => d.group);
        
        // Create nodes for each data point with better distribution
        groupedData.forEach((groupData, groupName) => {
            const groupX = xScale(groupName);
            const groupWidth = 120;
            
            const sortedData = groupData.sort((a, b) => a.parsedDate - b.parsedDate);
            
            sortedData.forEach((d, i) => {
                const xOffset = (Math.random() - 0.5) * groupWidth;
                d.displayX = groupX + xOffset;
                
                d.displayY = Math.max(margin.top + 20, Math.min(height - margin.bottom - 20, d.adjustedY));
            });
        });

        const nodes = svg.selectAll('.node')
            .data(filteredData)
            .enter()
            .append('circle')
            .attr('class', 'node')
            .attr('cx', d => d.displayX)
            .attr('cy', d => d.displayY)
            .attr('r', d => d.radius)
            .attr('fill', d => colorScale(d.group))
            .attr('opacity', 0.8)
            .attr('stroke', d => {
                if (d.isGeneratedDate) {
                    return '#FFD700'; 
                }
                return 'none';
            })
            .attr('stroke-width', d => {
                if (d.isGeneratedDate) {
                    return 1.5;
                }
                return 0;
            })
            .style('stroke-dasharray', d => {
                if (d.isGeneratedDate) {
                    return '2,2'; 
                }
                return 'none';
            })
            .on('click', handleClick)
            .on('touchstart', handleTouchStart)
            .on('touchend', handleTouchEnd)
            .on('mousedown', handleMouseDown)  
            .on('mouseup', handleMouseUp)
            .on('mouseleave', handleMouseUp);

        applyCollisionAvoidance(nodes);
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
            
            // 限制整体滚动范围
            if (scrollY > maxScrollY) {
                window.scrollTo(0, maxScrollY);
                return;
            }
            
            // 计算面板的限制位置
            const viewportHeight = window.innerHeight;
            const panelMaxTop = yAxisBottom - 100; // Y轴底部向上100px
            
            if (keywordPanel && keywordPanel.style.display === 'block') {
                const keywordPanelHeight = keywordPanel.offsetHeight;
                let keywordTop = 100 + scrollY; // 基础位置 + 滚动偏移
                
                keywordTop = Math.min(keywordTop, panelMaxTop - keywordPanelHeight);
                keywordTop = Math.max(keywordTop, scrollY + 20);
                
                keywordPanel.style.top = keywordTop + 'px';
                
                if (contentPanel && contentPanel.style.display === 'block') {
                    let contentTop = keywordTop + keywordPanelHeight + 10;
                    const contentPanelHeight = contentPanel.offsetHeight;
                    
                    // 确保content panel不超出Y轴底部
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
        // 创建力导向模拟
        const simulation = d3.forceSimulation(filteredData)
            .force('collision', d3.forceCollide().radius(d => d.radius + 3).strength(0.8))
            .force('x', d3.forceX(d => d.displayX).strength(0.3))
            .force('y', d3.forceY(d => d.displayY).strength(0.1))
            .alphaDecay(0.05)
            .velocityDecay(0.4);

        // 限制节点在各自的组内移动
        simulation.on('tick', () => {
            filteredData.forEach(d => {
                const groupX = xScale(d.group);
                const groupWidth = 160;
                
                // 水平约束：限制在组内
                d.x = Math.max(groupX - groupWidth/2, 
                    Math.min(groupX + groupWidth/2, d.x));
                
                // 垂直约束：允许适当的上下挤压，但不要超出边界
                d.y = Math.max(margin.top + 20, 
                    Math.min(height - margin.bottom - 20, d.y));
            });

            // 更新节点位置
            nodes.attr('cx', d => d.x)
                .attr('cy', d => d.y);
        });

        // 模拟结束后更新displayX和displayY
        simulation.on('end', () => {
            filteredData.forEach(d => {
                d.displayX = d.x;
                d.displayY = d.y;
            });
        });
    }

    function createConnectionLines() {
        // 为每个关键词创建连接线组
        const connectionLinesGroup = svg.append('g')
            .attr('class', 'connection-lines');
        
        // 预先计算所有关键词的连接
        const keywordConnections = {};
        
        // 收集所有关键词
        const allKeywords = new Set();
        filteredData.forEach(d => {
            d.keywords.forEach(keyword => allKeywords.add(keyword));
        });
        
        // 为每个关键词创建连接线
        allKeywords.forEach(keyword => {
            const nodesWithKeyword = filteredData.filter(d => d.keywords.includes(keyword));
            
            // 创建这个关键词下所有节点之间的连接
            for (let i = 0; i < nodesWithKeyword.length; i++) {
                for (let j = i + 1; j < nodesWithKeyword.length; j++) {
                    const node1 = nodesWithKeyword[i];
                    const node2 = nodesWithKeyword[j];
                    
                    // 创建弧形路径
                    const midX = (node1.displayX + node2.displayX) / 2;
                    const midY = (node1.displayY + node2.displayY) / 2;
                    const distance = Math.sqrt(Math.pow(node2.displayX - node1.displayX, 2) + Math.pow(node2.displayY - node1.displayY, 2));
                    
                    // 控制点偏移，创建弧度
                    const offsetX = -(node2.displayY - node1.displayY) * 0.1;
                    const offsetY = (node2.displayX - node1.displayX) * 0.1;
                    
                    const path = `M ${node1.x || node1.displayX} ${node1.y || node1.displayY} Q ${midX + offsetX} ${midY + offsetY} ${node2.x || node2.displayX} ${node2.y || node2.displayY}`;
                    
                    connectionLinesGroup.append('path')
                        .attr('d', path)
                        .attr('class', 'connection-line')
                        .attr('data-keyword', keyword)
                        .attr('data-nodes', `${node1.id}-${node2.id}`)
                        .style('display', 'block'); // 确保默认显示
                }
            }
        });
    }

    function createLegend() {
        const legend = categoryPanel.append('g')
            .attr('class', 'legend');

        legend.append('text')
            .attr('x', 0)
            .attr('y', -25)
            .attr('class', 'axis-label')
            .style('font-size', '12px')//标题
            .text('Categories');

        // Build type1 lists for each group
        const type1GroupMapArray = {};
        groupOrder.forEach(groupName => {
            type1GroupMapArray[groupName] = Object.keys(type1GroupMap).filter(type1 => type1GroupMap[type1] === groupName);
            legendExpanded[groupName] = false;
        });

        const legendHeights = {};
        const groupBlocks = {};

        // Build visual blocks for each group
        let currentY = 0;
        groupOrder.forEach(groupName => {
            const type1Items = type1GroupMapArray[groupName];
            const sanitizedGroup = groupName.replace(/\s+/g, '-').replace(/&/g, '');

            const block = legend.append('g')
                .attr('class', 'group-block')
                .attr('data-group', groupName)
                .attr('transform', `translate(0, ${currentY})`);

            groupBlocks[groupName] = block;
            legendHeights[groupName] = 30;

            const header = block.append('g')
                .attr('class', 'legend-group')
                .attr('data-group', groupName);

            const groupText = header.append('text')
                .attr('x', 15)
                .attr('y', 0)
                .attr('dy', '0.35em')
                .style('font-size', '10px')
                .style('font-weight', 'bold')
                .style('cursor', 'pointer')
                .style('user-select', 'none')
                .on('click touchend', (event) => {
                    event.preventDefault();
                    toggleLegendGroup(groupName);
                });

            // 处理长文本换行
            const words = groupName.split(' ');
            if (words.length > 1 && groupName.length > 12) {  // 如果超过12个字符且有空格
                words.forEach((word, i) => {
                    groupText.append('tspan')
                        .attr('x', 15)
                        .attr('dy', i === 0 ? '0.35em' : '1.2em')  // 第一行正常，后续行下移
                        .text(word);
                });
            } else {
                groupText.text(groupName);
            }
            header.append('circle')
                .attr('r', 7)
                .attr('fill', colorScale(groupName))
                .attr('opacity', 0.7);

            header.append('text')
                .attr('x', 15)
                .attr('y', 0)
                .attr('dy', '0.35em')
                .style('font-size', '10px')
                .style('font-weight', 'bold')
                .style('cursor', 'pointer')
                .style('user-select', 'none')
                .text(groupName)
                .on('click', () => toggleLegendGroup(groupName));

            const sub = block.append('g')
                .attr('class', `legend-subitems-${sanitizedGroup}`)
                .attr('transform', `translate(20, 20)`)
                .style('display', 'none');

            type1Items.forEach((type1, index) => {
                const item = sub.append('g')
                    .attr('class', 'legend-subitem')
                    .attr('transform', `translate(0, ${index * 22})`);

                item.append('circle')
                    .attr('r', 4)
                    .attr('fill', colorScale(groupName))
                    .attr('opacity', 0.5);

                item.append('text')//子分类
                    .attr('x', 12)
                    .attr('y', 0)
                    .attr('dy', '0.35em')
                    .style('font-size', '10px')
                    .style('cursor', 'pointer')
                    .style('user-select', 'none')
                    .text(type1)
                    .on('click touchend', (event) => {
                        event.preventDefault();
                        highlightType1(type1);
                    });
            });

            currentY += 30;
        });

        function toggleLegendGroup(groupName) {
            const isExpanded = legendExpanded[groupName];
            
            // 关闭所有其他的group
            Object.keys(legendExpanded).forEach(name => {
                if (name !== groupName && legendExpanded[name]) {
                    const sanitizedName = name.replace(/\s+/g, '-').replace(/&/g, '');
                    const subItems = svg.select(`.legend-subitems-${sanitizedName}`);
                    subItems.style('display', 'none');
                    legendExpanded[name] = false;
                    svg.select(`.legend-group[data-group="${name}"] .toggle-arrow`).text('▶');
                }
            });
            
            const sanitizedGroup = groupName.replace(/\s+/g, '-').replace(/&/g, '');
            const sub = svg.select(`.legend-subitems-${sanitizedGroup}`);

            legendExpanded[groupName] = !isExpanded;
            svg.select(`.legend-group[data-group="${groupName}"] .toggle-arrow`)
                .text(!isExpanded ? '▼' : '▶');
            sub.style('display', !isExpanded ? 'block' : 'none');

            legendHeights[groupName] = !isExpanded
                ? 30 + type1GroupMapArray[groupName].length * 22 + 10
                : 30;

            // Re-layout all group-blocks
            let yOffset = 0;
            groupOrder.forEach(name => {
                legendHeights[name] = legendExpanded[name] 
                    ? 30 + type1GroupMapArray[name].length * 22 + 10
                    : 30;
                groupBlocks[name]
                    .transition()
                    .duration(300)
                    .attr('transform', `translate(0, ${yOffset})`);
                yOffset += legendHeights[name];
            });
        }
    }

    function handleTouchStart(event, d) {
        event.preventDefault();
        
        isLongPressing = false;
        longPressTimer = setTimeout(() => {
            isLongPressing = true;
            handleLongPress(event, d);
        }, 600); 
    }

    function handleTouchEnd(event, d) {
        event.preventDefault();
        
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        
        if (!isLongPressing) {
            handleClick(event, d);
        }
        
        setTimeout(() => {
            isLongPressing = false;
        }, 100);
    }

    function handleMouseDown(event, d) {
        isLongPressing = false;
        longPressTimer = setTimeout(() => {
            isLongPressing = true;
            handleLongPress(event, d);
        }, 800); 
    }

    function handleMouseUp(event, d) {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }

    function handleClick(event, d) {
        if (isLongPressing) {
            isLongPressing = false;
            return;
        }

        let clientX, clientY;
        if (event.type === 'touchend') {
            const touch = event.changedTouches[0];
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }

        currentSelection = d;
        showNodePreview(d);
    }

    function handleLongPress(event, d) {
        console.log('Long press detected on:', d);
        isLongPressing = true;
        currentKeywordSelection = d;
        
        svg.selectAll('.connection-line').remove();
        
        svg.selectAll('.node')
            .attr('opacity', 0.1)
            .attr('r', d => d.radius)
            .style('filter', 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.2))');
        
        d3.select(event.target)
            .attr('opacity', 1)
            .attr('r', d => d.radius)
            .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))');

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
        
        const totalRelatedNodes = relatedNodes.length + 1; // +1 包括当前节点
        if (totalRelatedNodes <= 50) {
            const connectionLinesGroup = svg.select('.connection-lines');
            
            relatedNodes.forEach(node => {
                const midX = (d.displayX + node.displayX) / 2;
                const midY = (d.displayY + node.displayY) / 2;
                const offsetX = -(node.displayY - d.displayY) * 0.1;
                const offsetY = (node.displayX - d.displayX) * 0.1;
                
                const path = `M ${d.x || d.displayX} ${d.y || d.displayY} Q ${midX + offsetX} ${midY + offsetY} ${node.x || node.displayX} ${node.y || node.displayY}`;
                
                connectionLinesGroup.append('path')
                    .attr('d', path)
                    .attr('class', 'connection-line highlighted')
                    .attr('data-from', d.id)
                    .attr('data-to', node.id);
            });
            
            console.log(`Drew connection lines for ${totalRelatedNodes} total related nodes`);
        } else {
            console.log(`Skipped connection lines due to high count: ${totalRelatedNodes} > 50`);
        }

        showKeywordSelection(d.keywords);
        
        const contentPanel = document.getElementById('content-panel');
        if (contentPanel && contentPanel.style.display === 'block') {
            showNodePreview(d);
        }
    }

    // function showKeywordSelection(keywords) {
    //     const panel = document.getElementById('keyword-panel');
    //     panel.style.display = 'block';
        
    //     if (keywords.length === 0) {
    //         panel.innerHTML = '<h3>Keywords:</h3><p style="color: #666;">No keywords available</p>';
    //         return;
    //     }

    //     // 计算每个关键词的数量
    //     const keywordCounts = {};
    //     keywords.forEach(keyword => {
    //         const count = filteredData.filter(d => 
    //             d.keywords && d.keywords.includes(keyword.trim())
    //         ).length;
    //         keywordCounts[keyword] = count;
    //     });

    //     const keywordWidth = 280;
    //     const keywordHeight = 140;

    //     let html = '<h3 style="margin-top: 0; color: #ffffff; font-size: 12px;">Keywords:</h3>';
    //     html += `<div style="position: relative; width: ${keywordWidth}px; height: ${keywordHeight}px; margin: 10px 0;">`;

    //     // 中心点（动态计算）
    //     const centerX = (keywordWidth / 2) - 20;
    //     const centerY = keywordHeight / 2;
        
    //     // 中心黄色圆点
    //     html += `<div style="position: absolute; left: ${centerX-6}px; top: ${centerY-6}px; 
    //             width: 12px; height: 12px; background: #FFD700; border-radius: 50%; 
    //             border: 2px solid #FFF8DC; box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);"></div>`;
        
    //     // 关键词分布
    //     const numKeywords = keywords.length;
    //     keywords.forEach((keyword, index) => {
    //         let radiusX, radiusY, angle;
            
    //         if (numKeywords <= 6) {
    //             radiusX = 80;
    //             radiusY = 50;
    //             angle = (index / numKeywords) * 2 * Math.PI - Math.PI / 2;
    //         } else {
    //             if (index < 6) {
    //                 radiusX = 60;
    //                 radiusY = 35;
    //                 angle = (index / 6) * 2 * Math.PI - Math.PI / 2;
    //             } else {
    //                 const outerCount = numKeywords - 6;
    //                 const circleIndex = index - 6;
    //                 radiusX = 100;
    //                 radiusY = 60;
    //                 angle = (circleIndex / outerCount) * 2 * Math.PI - Math.PI / 2;
    //             }
    //         }
            
    //         const keywordX = centerX + radiusX * Math.cos(angle);
    //         const keywordY = centerY + radiusY * Math.sin(angle);
            
    //         // 连接线
    //         html += `<svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
    //                 <line x1="${centerX}" y1="${centerY}" x2="${keywordX}" y2="${keywordY}" 
    //                     stroke="#ddd" stroke-width="1" opacity="0.6"/>
    //                 </svg>`;
            
    //         // 关键词标签
    //         const count = keywordCounts[keyword];
    //         const displayText = `${keyword} (${count})`;
    //         const textLength = displayText.length * 6;
    //         const rectWidth = Math.max(textLength + 12, 30);
            
    //         html += `<div style="position: absolute; left: ${keywordX - rectWidth/2}px; top: ${keywordY - 8}px; 
    //                 background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; 
    //                 padding: 2px 6px; font-size: 10px; color: #333; text-align: center; 
    //                 cursor: pointer; user-select: none;" 
    //                 data-keyword="${keyword}" data-count="${count}" class="keyword-clickable">
    //                 ${displayText}
    //                 </div>`;
    //     });
        
    //     html += '</div>';
    //     panel.innerHTML = html;

    //     // 添加事件监听器到新创建的关键词元素
    //     panel.querySelectorAll('.keyword-clickable').forEach(element => {
    //         element.addEventListener('click', function() {
    //             const keyword = this.getAttribute('data-keyword');
    //             const count = parseInt(this.getAttribute('data-count'));
    //             console.log('Keyword clicked:', keyword, 'count:', count);
    //             highlightKeyword(keyword, count);
    //         });
    //     });

    //     repositionContentPanel();
    // }

    function showKeywordSelection(keywords) {
        const panel = document.getElementById('keyword-panel');
        panel.style.display = 'block';
        
        if (keywords.length === 0) {
            panel.innerHTML = '<h3>Keywords:</h3><p style="color: #666;">No keywords available</p>';
            return;
        }

        const keywordWidth = 230;
        const keywordHeight = 140;

        let html = '<h3 style="margin-top: 0; color: #ffffff; font-size: 12px;">Keywords:</h3>';
        html += `<div style="position: relative; width: ${keywordWidth}px; height: ${keywordHeight}px; margin: 10px 0;">`;

        const centerX = (keywordWidth / 2) + 20;
        const centerY = keywordHeight / 2;
        
        html += `<svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;">`;
        
        const numKeywords = keywords.length;
        keywords.forEach((keyword, index) => {
            let radiusX, radiusY, angle;
            
            if (numKeywords <= 6) {
                radiusX = 80;
                radiusY = 50;
                angle = (index / numKeywords) * 2 * Math.PI - Math.PI / 2;
            } else {
                if (index < 6) {
                    radiusX = 60;
                    radiusY = 35;
                    angle = (index / 6) * 2 * Math.PI - Math.PI / 2;
                } else {
                    const outerCount = numKeywords - 6;
                    const circleIndex = index - 6;
                    radiusX = 100;
                    radiusY = 60;
                    angle = (circleIndex / outerCount) * 2 * Math.PI - Math.PI / 2;
                }
            }
            
            const keywordX = centerX + radiusX * Math.cos(angle);
            const keywordY = centerY + radiusY * Math.sin(angle);
            
            html += `<line x1="${centerX}" y1="${centerY}" x2="${keywordX}" y2="${keywordY}" 
                    stroke="#ddd" stroke-width="1" opacity="0.6"/>`;
        });
        
        html += `</svg>`;
        
        html += `<div style="position: absolute; left: ${centerX-6}px; top: ${centerY-6}px; 
                width: 12px; height: 12px; background: #FFD700; border-radius: 50%; 
                border: 2px solid #FFF8DC; box-shadow: 0 0 8px rgba(255, 215, 0, 0.6); z-index: 2;"></div>`;
        
        keywords.forEach((keyword, index) => {
            let radiusX, radiusY, angle;
            
            if (numKeywords <= 6) {
                radiusX = 80;
                radiusY = 50;
                angle = (index / numKeywords) * 2 * Math.PI - Math.PI / 2;
            } else {
                if (index < 6) {
                    radiusX = 60;
                    radiusY = 35;
                    angle = (index / 6) * 2 * Math.PI - Math.PI / 2;
                } else {
                    const outerCount = numKeywords - 6;
                    const circleIndex = index - 6;
                    radiusX = 100;
                    radiusY = 60;
                    angle = (circleIndex / outerCount) * 2 * Math.PI - Math.PI / 2;
                }
            }
            
            const keywordX = centerX + radiusX * Math.cos(angle);
            const keywordY = centerY + radiusY * Math.sin(angle);
            
            const displayText = keyword;
            const textLength = displayText.length * 6;
            const rectWidth = Math.max(textLength + 12, 30);
            
            html += `<div style="position: absolute; left: ${keywordX - rectWidth/2}px; top: ${keywordY - 8}px; 
                    background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; 
                    padding: 2px 6px; font-size: 10px; color: #333; text-align: center; 
                    cursor: pointer; user-select: none; z-index: 3;" 
                    data-keyword="${keyword}" class="keyword-clickable">
                    ${displayText}
                    </div>`;
        });
        
        html += '</div>';
        panel.innerHTML = html;

        panel.querySelectorAll('.keyword-clickable').forEach(element => {
            panel.querySelectorAll('.keyword-clickable').forEach(element => {
            element.addEventListener('click', function() {
                const keyword = this.getAttribute('data-keyword');
                highlightKeyword(keyword);
            });
            
            element.addEventListener('touchend', function(e) {
                e.preventDefault();
                const keyword = this.getAttribute('data-keyword');
                highlightKeyword(keyword);
            });
        });
        });

        updateContentPanelPosition();
    }

    function repositionContentPanel() {
        const keywordPanel = document.getElementById('keyword-panel');
        const contentPanel = document.getElementById('content-panel');
        
        if (!keywordPanel || !contentPanel) {
            return;
        }
        
        if (contentPanel.style.display === 'block') {
            setTimeout(() => {
                const keywordPanelRect = keywordPanel.getBoundingClientRect();
                const keywordPanelBottom = keywordPanelRect.bottom;
                
                contentPanel.style.top = (keywordPanelBottom + 10) + 'px';
                console.log('Content panel repositioned to:', keywordPanelBottom + 10);
            }, 50); 
        }
    }


    function highlightKeyword(selectedKeyword) {
        console.log('Highlighting keyword:', selectedKeyword);
        
        if (!svg || !filteredData) {
            console.error('SVG or filteredData not available');
            return;
        }
        
        svg.selectAll('.connection-line').remove();
        
        svg.selectAll('.node')
            .attr('opacity', 0.1)
            .attr('r', d => d.radius)
            .style('filter', 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.2))');

        const nodesWithKeyword = filteredData.filter(d => 
            d.keywords && d.keywords.includes(selectedKeyword.trim())
        );
        
        const count = nodesWithKeyword.length;
        
        console.log(`Found ${nodesWithKeyword.length} nodes with keyword: ${selectedKeyword}`);
        
        if (nodesWithKeyword.length === 0) {
            console.warn('No nodes found with keyword:', selectedKeyword);
            return;
        }
        
        nodesWithKeyword.forEach(node => {
            svg.selectAll('.node')
                .filter(d => d.id === node.id)
                .attr('opacity', 1)
                .attr('r', d => d.radius)
                .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))');
        });
        
        if (count <= 50) {
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
                        .attr('class', 'connection-line highlighted');
                }
            }
            
            console.log(`Drew connection lines for ${count} nodes`);
        } else {
            console.log(`Skipped connection lines due to high count: ${count} > 50`);
        }
    }

    function updateContentPanelPosition() {
        const keywordPanel = document.getElementById('keyword-panel');
        const contentPanel = document.getElementById('content-panel');
        
        if (!contentPanel) {
            return;
        }
        
        if (keywordPanel && keywordPanel.style.display === 'block') {
            const keywordPanelHeight = keywordPanel.offsetHeight || 200; // 预估高度
            const contentTop = 100 + keywordPanelHeight + 10; // keyword面板位置 + 高度 + 10px间距
            contentPanel.style.top = contentTop + 'px';
        } else {
            contentPanel.style.top = '100px';
        }
    }

    function showNodePreview(d) {
        const contentPanel = document.getElementById('content-panel');
        
        if (!contentPanel) {
            console.error('content-panel element not found!');
            return;
        }
        
        contentPanel.style.display = 'block';
        contentPanel.style.height = 'auto';
        
        updateContentPanelPosition();
        
        const dateStr = d.isGeneratedDate ? 'Unknown (Generated)' : 
                    (d.parsedDate ? d.parsedDate.toLocaleDateString() : 'N/A');
        
        const keywordsStr = d.keywords && d.keywords.length > 0 ? 
                        d.keywords.join(', ') : 'None';
        
        let html = `
            <h3 style="margin-top: 0; color: #ffffff; font-size: 12px; border-bottom: 1px solid #444; padding-bottom: 8px;">
                Article Info
            </h3>
            <div style="font-size: 12px; line-height: 1.4;">
                <p style="margin: 8px 0;"><strong>Title:</strong><br>
                <span style="color: #e0e0e0;">${d.title || 'N/A'}</span></p>
                
                <p style="margin: 8px 0;"><strong>Date:</strong><br>
                <span style="color: #e0e0e0;">${dateStr}</span></p>
                
                <p style="margin: 8px 0;"><strong>Type:</strong><br>
                <span style="color: #e0e0e0;">${d.type1 || 'N/A'}</span></p>
                
                <p style="margin: 8px 0;"><strong>Group:</strong><br>
                <span style="color: #e0e0e0;">${d.group || 'N/A'}</span></p>
                
                <p style="margin: 8px 0;"><strong>Keywords:</strong><br>
                <span style="color: #e0e0e0; font-size: 9px;">${keywordsStr}</span></p>
            </div>
        `;

        // if (d.url) {
        //     html += `<p style="margin: 10px 0 0 0;">
        //             <a href="${d.url}" target="_blank" style="color: #4da6ff; text-decoration: none; font-size: 10px;">
        //             🔗 View Original
        //             </a></p>`;
        // }
                
        contentPanel.innerHTML = html;
    }

    function highlightType1(selectedType1) {
        console.log('Highlighting type1:', selectedType1);
        
        svg.selectAll('.connection-line').remove();
        
        svg.selectAll('.node')
            .attr('opacity', 0.1)
            .attr('r', d => d.radius)
            .style('filter', 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.2))');

        let targetTypes = [selectedType1];
        if (selectedType1 === 'Parliament') {
            targetTypes = ['Parliament', 'Scottish Government and Parliament'];
        }

        const nodesWithType1 = filteredData.filter(d => d.type1 === selectedType1);
        
        nodesWithType1.forEach(node => {
            svg.selectAll('.node')
                .filter(d => d.id === node.id)
                .attr('opacity', 1)
                .attr('r', d => d.radius * 1.2)
                .style('filter', 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))');
        });
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
    currentSelection = null;
    currentKeywordSelection = null;
    
    // 重置所有legend状态并折叠
    Object.keys(legendExpanded).forEach(key => {
        legendExpanded[key] = false;
    });
    
    if (svg) {
        // 清除连接线
        svg.selectAll('.connection-line').remove();
        
        svg.selectAll('.node')
            .transition()
            .duration(300)
            .attr('opacity', 0.8)
            .attr('r', d => d.radius)
            .style('filter', 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.3))');
        
        // 折叠所有legend items
        svg.selectAll('[class*="legend-subitems-"]').style('display', 'none');
        svg.selectAll('.toggle-arrow').text('▶');
        
        // 重新布局所有group blocks
        let yOffset = 0;
        groupOrder.forEach(groupName => {
            const groupBlock = svg.select(`.group-block[data-group="${groupName}"]`);
            if (!groupBlock.empty()) {
                groupBlock
                    .transition()
                    .duration(300)
                    .attr('transform', `translate(0, ${yOffset})`);
                yOffset += 30;
            }
        });
    }

    // 👇 修改：完全隐藏两个面板
    const keywordPanel = document.getElementById('keyword-panel');
    const contentPanel = document.getElementById('content-panel');
    
    if (keywordPanel) {
        keywordPanel.style.display = 'none';
        keywordPanel.innerHTML = '';
    }
    if (contentPanel) {
        contentPanel.style.display = 'none';
        contentPanel.innerHTML = '';
    }
}


window.highlightKeyword = highlightKeyword;

function setupFloatingPanelScrollBehavior() {
    let maxScrollY = 0;
    let yAxisBottom = 0;
    
    // 计算Y轴底部位置
    function calculateLimits() {
        if (yScale && yScale.customPositions) {
            const lastPosition = yScale.customPositions[yScale.customPositions.length - 1];
            yAxisBottom = lastPosition.y + lastPosition.height;
            maxScrollY = Math.max(yAxisBottom - window.innerHeight + 200, 0);
        }
    }
    
    // 滚动监听器
    function handleScroll() {
        const scrollY = window.scrollY;
        const keywordPanel = document.getElementById('keyword-panel');
        const contentPanel = document.getElementById('content-panel');
        
        // 限制整体滚动范围
        if (scrollY > maxScrollY) {
            window.scrollTo(0, maxScrollY);
            return;
        }
        
        // 计算面板的限制位置
        const panelMaxTop = yAxisBottom - 100; // Y轴底部向上100px
        
        // 处理keyword panel
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
