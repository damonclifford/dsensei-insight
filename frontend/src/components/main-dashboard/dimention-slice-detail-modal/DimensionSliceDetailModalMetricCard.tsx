import {
  Card,
  DeltaBar,
  Flex,
  Grid,
  List,
  ListItem,
  Subtitle,
  Text,
  Title,
} from "@tremor/react";
import { DimensionSliceKey, InsightMetric } from "../../../common/types";
import {
  formatDimensionSliceKeyForRendering,
  formatMetricName,
  formatNumber,
  getRegexMatchPatternForDimensionSliceKey,
  serializeDimensionSliceKey,
} from "../../../common/utils";

type Props = {
  selectedSliceKey: DimensionSliceKey;
  metric: InsightMetric;
};
export function DimensionSliceDetailModalMetricCard({
  selectedSliceKey,
  metric,
}: Props) {
  const matchingRegex =
    getRegexMatchPatternForDimensionSliceKey(selectedSliceKey);

  const relatedSliceInfo = Object.keys(metric.dimensionSliceInfo)
    .filter((key) => key.match(matchingRegex))
    .map((key) => metric.dimensionSliceInfo[key]!)
    .sort((info1, info2) => {
      return info2.impact - info1.impact;
    });
  const maxImpact = Math.max(
    ...relatedSliceInfo.map((info) => Math.abs(info.impact))
  );
  return (
    <Flex className="justify-center mt-5">
      <Card className="w-[80%]">
        <Flex justifyContent="center">
          <Title>Metrics: {formatMetricName(metric)}</Title>
        </Flex>
        {relatedSliceInfo.length === 0 ? (
          <Flex justifyContent="center">
            <Subtitle>No slice with significant impact</Subtitle>
          </Flex>
        ) : (
          <Grid numItems={2}>
            <div>
              <List>
                <ListItem className="justify-center">
                  <Subtitle>Slice</Subtitle>
                </ListItem>
                {relatedSliceInfo.map((sliceInfo) => (
                  <ListItem className="h-[50px] justify-center">
                    {formatDimensionSliceKeyForRendering(
                      sliceInfo?.key!,
                      undefined,
                      serializeDimensionSliceKey(sliceInfo?.key) ===
                        serializeDimensionSliceKey(selectedSliceKey)
                    )}
                  </ListItem>
                ))}
              </List>
            </div>
            <div>
              <List>
                <ListItem className="justify-center">
                  <Subtitle>Impact</Subtitle>
                </ListItem>
                {relatedSliceInfo.map((sliceInfo) => {
                  return (
                    <ListItem className="h-[50px]">
                      <Flex
                        justifyContent="end"
                        alignItems="center"
                        className="space-x-4"
                      >
                        <Text
                          color={sliceInfo.impact > 0 ? "emerald" : "rose"}
                          className="truncate"
                        >
                          {sliceInfo.impact > 0 ? "+" : ""}
                          {formatNumber(sliceInfo.impact)} (
                          {sliceInfo.baselineValue.sliceValue === 0
                            ? "N/A"
                            : `${sliceInfo.impact > 0 ? "+" : ""}${formatNumber(
                                ((sliceInfo.comparisonValue.sliceValue -
                                  sliceInfo.baselineValue.sliceValue) /
                                  sliceInfo.baselineValue.sliceValue) *
                                  100
                              )}%`}
                          )
                        </Text>
                        <DeltaBar
                          value={(sliceInfo.impact / maxImpact) * 100}
                          className="w-[80%]"
                        />
                      </Flex>
                    </ListItem>
                  );
                })}
              </List>
            </div>
          </Grid>
        )}
      </Card>
    </Flex>
  );
}
