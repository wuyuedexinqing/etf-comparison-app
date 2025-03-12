// 全局变量
let gldData = [];
let ibitData = [];
let currentTimeframe = 'daily';

// 缓存机制
const cache = {
    data: {},
    timestamps: {}
};

// 缓存过期时间（毫秒）
const CACHE_EXPIRATION = 60 * 60 * 1000; // 1小时

// 重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

// Alpha Vantage API密钥（替换为您的实际密钥）
const API_KEY = 'XIK06MDH33YFE33V';

/**
 * 页面加载完成后初始化应用
 */
document.addEventListener('DOMContentLoaded', () => {
    // 初始化时间周期选择器
    initTimeframeSelector();
    
    // 加载ETF数据
    loadETFData();
});

/**
 * 初始化时间周期选择器
 */
function initTimeframeSelector() {
    const buttons = document.querySelectorAll('.timeframe-selector button');
    
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有按钮的活动状态
            buttons.forEach(btn => btn.classList.remove('active'));
            
            // 激活当前按钮
            button.classList.add('active');
            
            // 更新时间周期并重新处理数据
            currentTimeframe = button.dataset.timeframe;
            updateCharts();
        });
    });
}

/**
 * 加载ETF数据
 */
async function loadETFData() {
    showLoading(true);
    hideError();
    
    try {
        // 获取GLD数据（黄金ETF）
        const gldResult = await fetchETFData('GLD');
        if (gldResult.success) {
            gldData = processData(gldResult.data);
        } else {
            throw new Error(`获取GLD数据失败: ${gldResult.error}`);
        }
        
        // 获取IBIT数据（比特币ETF）
        const ibitResult = await fetchETFData('IBIT');
        if (ibitResult.success) {
            ibitData = processData(ibitResult.data);
        } else {
            throw new Error(`获取IBIT数据失败: ${ibitResult.error}`);
        }
        
        // 更新图表
        updateCharts();
    } catch (err) {
        showError(err.message);
        console.error('加载数据错误:', err);
    } finally {
        showLoading(false);
    }
}

/**
 * 检查缓存是否有效
 */
function isValidCache(symbol, timeframe) {
    const key = `${symbol}-${timeframe}`;
    const timestamp = cache.timestamps[key];
    
    if (!timestamp) return false;
    
    const now = new Date().getTime();
    return (now - timestamp) < CACHE_EXPIRATION && cache.data[key];
}

/**
 * 使用重试机制获取数据
 */
async function fetchWithRetry(url, retries = 0) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        if (retries < MAX_RETRIES) {
            console.log(`重试请求 ${retries + 1} 次: ${url}`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return fetchWithRetry(url, retries + 1);
        }
        return { success: false, error: error.message };
    }
}

/**
 * 从Alpha Vantage获取ETF数据
 */
async function fetchETFData(symbol, outputSize = 'full') {
    const cacheKey = `${symbol}-${outputSize}`;
    
    // 首先检查缓存
    if (isValidCache(symbol, outputSize)) {
        console.log(`使用${symbol}的缓存数据`);
        return { success: true, data: cache.data[cacheKey] };
    }
    
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputSize}&apikey=${API_KEY}`;
    
    const result = await fetchWithRetry(url);
    
    // 如果获取成功，更新缓存
    if (result.success) {
        cache.data[cacheKey] = result.data;
        cache.timestamps[cacheKey] = new Date().getTime();
    }
    
    return result;
}

/**
 * 处理来自Alpha Vantage API的原始数据
 */
function processData(rawData) {
    if (!rawData || !rawData['Time Series (Daily)']) {
        return [];
    }
    
    const timeSeries = rawData['Time Series (Daily)'];
    
    return Object.entries(timeSeries).map(([date, values]) => ({
        date: new Date(date),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'], 10)
    })).sort((a, b) => a.date - b.date);
}

/**
 * 根据选定的时间周期聚合数据
 */
function aggregateData(data, timeframe) {
    if (!data || data.length === 0) return [];
    
    switch (timeframe) {
        case 'daily':
            return data;
            
        case 'weekly':
            return aggregateByPeriod(data, item => {
                const date = new Date(item.date);
                const year = date.getFullYear();
                const week = getWeekNumber(date);
                return `${year}-W${week}`;
            });
            
        case 'monthly':
            return aggregateByPeriod(data, item => {
                const date = item.date;
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            });
            
        case 'quarterly':
            return aggregateByPeriod(data, item => {
                const date = item.date;
                const quarter = Math.floor(date.getMonth() / 3) + 1;
                return `${date.getFullYear()}-Q${quarter}`;
            });
            
        case 'yearly':
            return aggregateByPeriod(data, item => {
                return item.date.getFullYear().toString();
            });
            
        default:
            return data;
    }
}

/**
 * 获取ISO周数
 */
function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * 按周期（周、月、季度、年）聚合数据
 */
function aggregateByPeriod(data, getPeriodKey) {
    const periods = {};
    
    // 按周期分组数据
    data.forEach(item => {
        const key = getPeriodKey(item);
        
        if (!periods[key]) {
            periods[key] = {
                items: [item],
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
                volume: item.volume,
                date: key,
                displayDate: new Date(item.date) // 保存一个实际日期对象用于图表展示
            };
        } else {
            periods[key].items.push(item);
            periods[key].high = Math.max(periods[key].high, item.high);
            periods[key].low = Math.min(periods[key].low, item.low);
            periods[key].close = item.close; // 最后一个收盘价
            periods[key].volume += item.volume;
        }
    });
    
    return Object.values(periods).sort((a, b) => {
        // 按日期排序
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return 0;
    });
}

/**
 * 更新图表
 */
function updateCharts() {
    // 处理聚合数据
    const processedGldData = aggregateData(gldData, currentTimeframe);
    const processedIbitData = aggregateData(ibitData, currentTimeframe);
    
    // 绘制图表
    if (processedGldData.length > 0) {
        drawChart('gldChart', processedGldData, '#FFD700', 'gld-line');
    }
    
    if (processedIbitData.length > 0) {
        drawChart('ibitChart', processedIbitData, '#F7931A', 'ibit-line');
    }
}

/**
 * 使用D3绘制图表
 */
function drawChart(containerId, data, color, lineClass) {
    // 清除旧图表
    document.getElementById(containerId).innerHTML = '';
    
    // 设置图表尺寸和边距
    const margin = {top: 20, right: 50, bottom: 50, left: 50};
    const container = document.getElementById(containerId);
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;
    
    // 创建SVG元素
    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // 创建X轴比例尺
    const x = d3.scaleTime()
        .domain(d3.extent(data, d => {
            // 如果是日线数据，直接使用日期对象
            if (currentTimeframe === 'daily') {
                return d.date;
            }
            // 否则使用保存的显示日期
            return d.displayDate;
        }))
        .range([0, width]);
    
    // 创建Y轴比例尺
    const y = d3.scaleLinear()
        .domain([
            d3.min(data, d => d.low) * 0.95, // 留一些边距
            d3.max(data, d => d.high) * 1.05
        ])
        .range([height, 0]);
    
    // 添加X轴
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));
    
    // 添加X轴标题
    svg.append('text')
        .attr('class', 'axis-title')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .text('日期');
    
    // 添加Y轴
    svg.append('g')
        .call(d3.axisLeft(y));
    
    // 添加Y轴标题
    svg.append('text')
        .attr('class', 'axis-title')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 15)
        .attr('x', -height / 2)
        .text('价格（美元）');
    
    // 创建线生成器
    const line = d3.line()
        .x(d => {
            if (currentTimeframe === 'daily') {
                return x(d.date);
            }
            return x(d.displayDate);
        })
        .y(d => y(d.close));
    
    // 添加线条路径
    svg.append('path')
        .datum(data)
        .attr('class', `line ${lineClass}`)
        .attr('d', line);
    
    // 创建工具提示
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip');
    
    // 添加交互点
    svg.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('r', 3)
        .attr('cx', d => {
            if (currentTimeframe === 'daily') {
                return x(d.date);
            }
            return x(d.displayDate);
        })
        .attr('cy', d => y(d.close))
        .attr('fill', color)
        .style('opacity', 0) // 默认不可见
        .on('mouseover', function(event, d) {
            // 显示点
            d3.select(this).style('opacity', 1);
            
            // 显示工具提示
            let dateDisplay;
            if (currentTimeframe === 'daily') {
                dateDisplay = d.date.toLocaleDateString();
            } else {
                dateDisplay = d.date; // 使用周期标识符
            }
            
            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
                
            tooltip.html(`
                <strong>日期: ${dateDisplay}</strong><br/>
                开盘: $${d.open.toFixed(2)}<br/>
                最高: $${d.high.toFixed(2)}<br/>
                最低: $${d.low.toFixed(2)}<br/>
                收盘: $${d.close.toFixed(2)}<br/>
                交易量: ${d.volume.toLocaleString()}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            // 隐藏点
            d3.select(this).style('opacity', 0);
            
            // 隐藏工具提示
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });
}

/**
 * 显示或隐藏加载指示器
 */
function showLoading(show) {
    const loader = document.getElementById('loadingIndicator');
    loader.style.display = show ? 'block' : 'none';
}

/**
 * 显示错误消息
 */
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

/**
 * 隐藏错误消息
 */
function hideError() {
    const errorElement = document.getElementById('errorMessage');
    errorElement.style.display = 'none';
}
