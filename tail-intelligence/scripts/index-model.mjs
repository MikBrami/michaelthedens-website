const clamp = (value, minimum = 0, maximum = 100) =>
  Math.min(maximum, Math.max(minimum, Number(value) || 0));

const DEFAULT_RANK_WEIGHTS = [1, 0.7, 0.5, 0.35, 0.25];

function daysBetween(earlier, later) {
  const start = Date.parse(String(earlier || ''));
  const end = Date.parse(String(later || ''));
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, (end - start) / 86_400_000);
}

function rankWeightedAverage(observations, rankWeights = DEFAULT_RANK_WEIGHTS) {
  const ranked = [...observations]
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, rankWeights.length);
  if (!ranked.length) return { value: 0, confidence: 0, count: 0 };

  let weightedValue = 0;
  let weightedConfidence = 0;
  let weightTotal = 0;
  ranked.forEach((observation, index) => {
    const weight = Number(rankWeights[index] ?? rankWeights.at(-1) ?? 1);
    weightedValue += observation.magnitude * weight;
    weightedConfidence += observation.confidence * weight;
    weightTotal += weight;
  });

  return {
    value: weightTotal ? weightedValue / weightTotal : 0,
    confidence: weightTotal ? weightedConfidence / weightTotal : 0,
    count: ranked.length
  };
}

export function statusForIndex(score, thresholds = {}) {
  if (!Number.isFinite(score)) return 'unknown';
  if (score >= Number(thresholds.red ?? 82)) return 'red';
  if (score >= Number(thresholds.orange ?? 65)) return 'orange';
  if (score >= Number(thresholds.yellow ?? 45)) return 'yellow';
  return 'green';
}

function driverObservation(article, driverId, model, asOf) {
  if (article.indexImpact === false) return null;
  const impact = Number(model.signalDriverImpact?.[article.signal]?.[driverId] ?? 0);
  if (!impact) return null;

  if (driverId === 'aiDemand') {
    const contextMarkets = model.aiDemandContextMarkets || ['ai_infrastructure'];
    if (!contextMarkets.some((market) => (article.markets || []).includes(market))) return null;
  }

  const severity = clamp(article.severity);
  const confidence = clamp(article.confidence);
  const halfLifeDays = Math.max(1, Number(model.recencyHalfLifeDays ?? 90));
  const recency = 0.5 ** (daysBetween(article.date, asOf) / halfLifeDays);
  const magnitude = severity * (confidence / 100) * Math.abs(impact) * recency;

  return {
    id: article.id,
    direction: Math.sign(impact),
    magnitude,
    confidence,
    recency
  };
}

function operationalObservation(indicator, driverId, model, asOf) {
  if (indicator.driver !== driverId) return null;
  const severity = model.operationalStateScale?.[indicator.state];
  if (!Number.isFinite(severity)) return null;
  const confidence = clamp(indicator.confidence);
  const halfLifeDays = Math.max(1, Number(indicator.halfLifeDays ?? 14));
  const recency = 0.5 ** (daysBetween(indicator.date, asOf) / halfLifeDays);
  return {
    id: indicator.id,
    direction: 1,
    magnitude: clamp(severity) * (confidence / 100) * recency,
    confidence,
    recency,
    sourceType: indicator.sourceType || 'operational'
  };
}

function calculateDriver(articles, indicators, driverId, model, asOf) {
  const observations = [
    ...articles
    .map((article) => driverObservation(article, driverId, model, asOf))
    .filter(Boolean),
    ...indicators
      .map((indicator) => operationalObservation(indicator, driverId, model, asOf))
      .filter(Boolean)
  ];
  const positive = rankWeightedAverage(
    observations.filter((item) => item.direction > 0),
    model.rankWeights
  );
  const relief = rankWeightedAverage(
    observations.filter((item) => item.direction < 0),
    model.rankWeights
  );
  const reliefOffset = clamp(model.reliefOffsetPercent ?? 60, 0, 100) / 100;
  const operationalFloor = Math.max(0, ...observations
    .filter((item) => item.sourceType === 'operational_channel_observation' && item.direction > 0)
    .map((item) => item.magnitude));
  const score = Math.round(clamp(Math.max(positive.value - relief.value * reliefOffset, operationalFloor)));
  const evidenceCount = positive.count + relief.count;
  const confidence = evidenceCount
    ? Math.round((positive.confidence * positive.count + relief.confidence * relief.count) / evidenceCount)
    : 0;

  return {
    id: driverId,
    label: model.driverLabels?.[driverId] ?? driverId,
    score: evidenceCount ? score : null,
    confidence,
    evidenceCount,
    pressure: Math.round(positive.value),
    relief: Math.round(relief.value),
    operationalFloor: Math.round(operationalFloor),
    formula: 'pressure - relief × reliefOffset'
  };
}

export function calculateIndexModel(articles, methodology, options = {}) {
  const model = methodology.indexModel;
  if (!model) throw new Error('methodology.indexModel is missing');
  const operationalIndicators = Array.isArray(options.operationalIndicators) ? options.operationalIndicators : [];
  const indexDates = [
    ...articles
      .filter((article) => article.indexImpact !== false)
      .map((article) => article.date),
    ...operationalIndicators.map((indicator) => indicator.date)
  ].filter(Boolean).sort();
  const asOf = indexDates.at(-1)
    || options.asOf
    || articles.map((article) => article.date).filter(Boolean).sort().at(-1);
  const marketIds = new Set([
    ...Object.keys(model.executiveMarketWeights || {}),
    ...articles.flatMap((article) => article.markets || [])
  ]);
  const driverWeightEntries = Object.entries(model.driverWeights || {});
  const totalDriverWeight = driverWeightEntries.reduce((sum, [, weight]) => sum + Number(weight), 0);
  if (Math.abs(totalDriverWeight - 1) > 0.000001) {
    throw new Error(`Index driver weights must total 1, got ${totalDriverWeight}`);
  }

  const markets = [...marketIds].map((id) => {
    const policy = model.marketEvidencePolicies?.[id] || {};
    const marketArticles = articles.filter((article) => {
      if (!(article.markets || []).includes(id)) return false;
      if ((policy.excludeArticlesAlsoTagged || []).some((market) => (article.markets || []).includes(market))) return false;
      if (Array.isArray(policy.articleKeywords) && policy.articleKeywords.length) {
        const text = `${article.title || ''} ${article.summary || ''}`.toLowerCase();
        return policy.articleKeywords.some((keyword) => text.includes(String(keyword).toLowerCase()));
      }
      return true;
    });
    const marketIndicators = operationalIndicators.filter((indicator) => indicator.market === id);
    const drivers = driverWeightEntries.map(([driverId]) => calculateDriver(marketArticles, marketIndicators, driverId, model, asOf));
    const available = drivers.filter((driver) => driver.score !== null);
    const availableWeight = available.reduce((sum, driver) => sum + Number(model.driverWeights[driver.id]), 0);
    const rawScore = availableWeight
      ? Math.round(available.reduce((sum, driver) => sum + driver.score * Number(model.driverWeights[driver.id]), 0) / availableWeight)
      : 0;
    const evidenceConfidence = availableWeight
      ? available.reduce((sum, driver) => sum + driver.confidence * Number(model.driverWeights[driver.id]), 0) / availableWeight
      : 0;
    const coverage = totalDriverWeight ? availableWeight / totalDriverWeight : 0;
    const sufficientlyCovered = coverage * 100 >= Number(model.minimumSegmentCoveragePercent ?? 70);
    const score = sufficientlyCovered ? rawScore : null;

    return {
      id,
      score,
      indicativeScore: rawScore,
      sufficientlyCovered,
      status: statusForIndex(score, model.statusThresholds),
      signals: marketArticles.length + marketIndicators.length,
      articleSignals: marketArticles.length,
      operationalSignals: marketIndicators.length,
      confidence: Math.round(evidenceConfidence * coverage),
      coverage: Math.round(coverage * 100),
      drivers
    };
  });

  const marketById = new Map(markets.map((market) => [market.id, market]));
  const executiveEntries = Object.entries(model.executiveMarketWeights || {});
  const totalExecutiveWeight = executiveEntries.reduce((sum, [, weight]) => sum + Number(weight), 0);
  if (Math.abs(totalExecutiveWeight - 1) > 0.000001) {
    throw new Error(`Executive market weights must total 1, got ${totalExecutiveWeight}`);
  }
  const availableExecutive = executiveEntries.filter(([id]) => Number.isFinite(marketById.get(id)?.score));
  const availableExecutiveWeight = availableExecutive.reduce((sum, [, weight]) => sum + Number(weight), 0);
  const executiveScore = availableExecutiveWeight
    ? Math.round(availableExecutive.reduce((sum, [id, weight]) => sum + marketById.get(id).score * Number(weight), 0) / availableExecutiveWeight)
    : 0;
  const executiveConfidence = availableExecutiveWeight
    ? Math.round(availableExecutive.reduce((sum, [id, weight]) => sum + marketById.get(id).confidence * Number(weight), 0) / availableExecutiveWeight)
    : 0;
  const criticalMarkets = (model.criticalMarkets || []).map((id) => marketById.get(id)).filter(Boolean);
  const criticalPeak = Math.max(0, ...criticalMarkets.map((market) => market.score).filter(Number.isFinite));
  const criticalAvailabilityPeak = Math.max(0, ...criticalMarkets
    .map((market) => market.drivers.find((driver) => driver.id === 'availability')?.score)
    .filter(Number.isFinite));
  const availabilityShare = clamp(model.riskAvailabilitySharePercent ?? 40, 0, 100) / 100;
  const riskPressure = Math.round(criticalPeak * (1 - availabilityShare) + criticalAvailabilityPeak * availabilityShare);
  const executiveDrivers = driverWeightEntries.map(([driverId, driverWeight]) => {
    const observations = availableExecutive
      .map(([marketId, marketWeight]) => ({
        marketWeight: Number(marketWeight),
        driver: marketById.get(marketId).drivers.find((item) => item.id === driverId)
      }))
      .filter((item) => item.driver?.score !== null);
    const representedWeight = observations.reduce((sum, item) => sum + item.marketWeight, 0);
    const score = representedWeight
      ? Math.round(observations.reduce((sum, item) => sum + item.driver.score * item.marketWeight, 0) / representedWeight)
      : null;
    return {
      id: driverId,
      name: model.driverLabels?.[driverId] ?? driverId,
      score,
      absoluteSeverity: score,
      delta: 0,
      weight: Number(driverWeight),
      coverage: Math.round(representedWeight / totalExecutiveWeight * 100),
      rawMetric: `Gewicht im Segmentindex: ${Math.round(Number(driverWeight) * 100)}%`
    };
  });

  return {
    version: model.version,
    asOf,
    executiveScore,
    executiveConfidence,
    riskPressure,
    riskFormula: `${Math.round((1 - availabilityShare) * 100)}% critical segment peak + ${Math.round(availabilityShare * 100)}% critical availability peak`,
    status: statusForIndex(executiveScore, model.statusThresholds),
    coverage: Math.round(availableExecutiveWeight / totalExecutiveWeight * 100),
    drivers: executiveDrivers,
    markets,
    formula: 'Σ(segment score × segment weight)',
    confidencePolicy: 'Confidence is reported separately and never increases the market-stress score.'
  };
}