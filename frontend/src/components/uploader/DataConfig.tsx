import {
  Bold,
  Button,
  Card,
  Divider,
  Flex,
  Subtitle,
  Text,
  Title,
} from "@tremor/react";
import moment from "moment";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker, { DateRangeData } from "./DatePicker";
import MultiSelector from "./MultiSelector";
import { ExpectedChangeInput } from "./NumberInput";
import SingleSelector from "./SingleSelector";

type DataConfigProps = {
  header: string[];
  data: {
    [k: string]: string;
  }[];
  file: File | undefined;
  csvContent: string;
};

function DataConfig({ header, data, csvContent, file }: DataConfigProps) {
  const [selectedColumns, setSelectedColumns] = useState<{
    [k: string]: {
      type: string;
      aggregationOption: string | null;
      expectedValue: number | null;
    };
  }>({});
  const [comparisonDateRangeData, setComparisonDateRangeData] =
    useState<DateRangeData>({
      range: {},
      stats: {},
    });
  const [baseDateRangeData, setBaseDateRangeData] = useState<DateRangeData>({
    range: {},
    stats: {},
  });

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [countByDate, setCountByDate] = useState<{
    [key: string]: number;
  }>({});
  const navigate = useNavigate();

  const onSelectMetrics = (metrics: string[], type: string) => {
    const selectedColumnsClone = Object.assign({}, selectedColumns);
    const addedMetrics = metrics.filter(
      (m) =>
        !Object.keys(selectedColumnsClone).includes(m) ||
        (Object.keys(selectedColumnsClone).includes(m) &&
          selectedColumnsClone[m]["type"] !== type)
    );
    addedMetrics.map(
      (m) =>
        (selectedColumnsClone[m] = {
          type: type,
          aggregationOption: "sum",
          expectedValue: 0.0,
        })
    );
    const removedMetrics = Object.keys(selectedColumnsClone).filter(
      (m) => selectedColumnsClone[m]["type"] === type && !metrics.includes(m)
    );
    removedMetrics.map((m) => delete selectedColumnsClone[m]);
    setSelectedColumns(selectedColumnsClone);
  };

  const onSelectMetricAggregationOption = (
    metric: string,
    aggregationOption: string
  ) => {
    const selectedColumnsClone = Object.assign({}, selectedColumns);
    if (
      selectedColumnsClone[metric]["type"] !== "metric" &&
      selectedColumnsClone[metric]["type"] !== "supporting_metric"
    ) {
      throw new Error(
        "Invalid aggregation option update on non-metric columns."
      );
    }
    selectedColumnsClone[metric]["aggregationOption"] = aggregationOption;
    setSelectedColumns(selectedColumnsClone);
  };

  const onSelectMetricDefaultValue = (
    metric: string,
    expectedValue: number
  ) => {
    const selectedColumnsClone = Object.assign({}, selectedColumns);
    if (
      selectedColumnsClone[metric]["type"] !== "metric" &&
      selectedColumnsClone[metric]["type"] !== "supporting_metric"
    ) {
      throw new Error("Invalid default value update on non-metric columns.");
    }
    selectedColumnsClone[metric]["expectedValue"] = expectedValue;
    setSelectedColumns(selectedColumnsClone);
  };

  const onSelectDimension = (dimensions: string[]) => {
    const selectedColumnsClone = Object.assign({}, selectedColumns);
    const addedDimensions = dimensions.filter(
      (d) =>
        !Object.keys(selectedColumnsClone).includes(d) ||
        (Object.keys(selectedColumnsClone).includes(d) &&
          selectedColumnsClone[d]["type"] !== "dimension")
    );
    addedDimensions.map(
      (d) =>
        (selectedColumnsClone[d] = {
          type: "dimension",
          aggregationOption: null,
          expectedValue: null,
        })
    );
    const removedDimension = Object.keys(selectedColumnsClone).filter(
      (d) =>
        selectedColumnsClone[d]["type"] === "dimension" &&
        !dimensions.includes(d)
    );
    removedDimension.map((m) => delete selectedColumnsClone[m]);
    setSelectedColumns(selectedColumnsClone);
  };

  const onSelectDateColumn = (dateCol: string) => {
    const selectedColumnsClone = Object.assign({}, selectedColumns);
    const prevDateColumns = Object.keys(selectedColumnsClone).filter(
      (m) => selectedColumnsClone[m]["type"] === "date"
    );
    if (prevDateColumns.length > 1) {
      throw new Error("Found more than 1 date columns.");
    }
    prevDateColumns.map((d) => delete selectedColumnsClone[d]);
    selectedColumnsClone[dateCol] = {
      type: "date",
      aggregationOption: null,
      expectedValue: null,
    };
    setSelectedColumns(selectedColumnsClone);

    const countByDate: {
      [key: string]: number;
    } = {};
    data.forEach((row) => {
      if (Number.isNaN(Date.parse(row[dateCol]))) {
        return;
      }

      const dateStr = moment(new Date(Date.parse(row[dateCol]))).format(
        "YYYY-MM-DD"
      );
      if (dateStr !== "Invalid date") {
        if (!countByDate[dateStr]) {
          countByDate[dateStr] = 1;
        } else {
          countByDate[dateStr] = countByDate[dateStr] + 1;
        }
      }
    });
    setCountByDate(countByDate);
    setBaseDateRangeData({ range: {}, stats: {} });
    setComparisonDateRangeData({ range: {}, stats: {} });
  };

  const selectedDateCol = Object.keys(selectedColumns).find(
    (c) => selectedColumns[c]["type"] === "date"
  );

  const potentialDateCols = header.filter((h) => {
    const value = data[0][h];
    if (Number.isNaN(Number(value))) {
      // parse non number string
      return !Number.isNaN(Date.parse(value));
    } else if (Number(value) > 631152000) {
      // Timestamp larger than 1990/1/1
      return true;
    } else {
      return false;
    }
  });

  function canSubmit() {
    const hasMetricColumn =
      Object.values(selectedColumns).filter(
        (column) => column.type === "metric"
      ).length > 0;

    const hasDimensionColumn =
      Object.values(selectedColumns).filter(
        (column) => column.type === "dimension"
      ).length > 0;

    return (
      csvContent.length > 0 &&
      comparisonDateRangeData.range.from &&
      comparisonDateRangeData.range.to &&
      (comparisonDateRangeData.stats.numRows ?? 0) > 0 &&
      baseDateRangeData.range.from &&
      baseDateRangeData.range.to &&
      (baseDateRangeData.stats.numRows ?? 0) > 0 &&
      hasMetricColumn &&
      hasDimensionColumn
    );
  }

  const handleOnSubmit = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file!);
    const res = await fetch(
      process.env.NODE_ENV === "development"
        ? "http://127.0.0.1:5001/api/file_upload"
        : "/api/file_upload",
      {
        mode: "cors",
        method: "POST",
        body: formData,
      }
    );

    const { id } = await res.json();
    navigate("/dashboard", {
      state: {
        fileId: id,
        selectedColumns,
        baseDateRange: baseDateRangeData.range,
        comparisonDateRange: comparisonDateRangeData.range,
      },
    });
  };

  return (
    <Card className="max-w-6xl mx-auto">
      <Title>Report Config</Title>
      <Divider />
      <div className="flex flex-col gap-4">
        {/* Date column selector */}
        <SingleSelector
          title={
            <Text className="pr-4 text-black">{"Select date column"}</Text>
          }
          labels={potentialDateCols.length === 0 ? header : potentialDateCols}
          values={potentialDateCols.length === 0 ? header : potentialDateCols}
          selectedValue={selectedDateCol ? selectedDateCol : ""}
          onValueChange={onSelectDateColumn}
          instruction={
            <Text>
              Choose the column that is parsable to dates. E.g:{" "}
              <Bold>2020-04-13</Bold>. See supported format{" "}
              <a
                target="_blank"
                rel="noreferrer"
                className="text-blue-800 underline"
                href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format"
              >
                here
              </a>
              .
            </Text>
          }
        />
        {/* Date pickers */}
        {selectedDateCol && (
          <DatePicker
            title={"Select date ranges"}
            countByDate={countByDate}
            comparisonDateRangeData={comparisonDateRangeData}
            setComparisonDateRangeData={setComparisonDateRangeData}
            baseDateRangeData={baseDateRangeData}
            setBaseDateRangeData={setBaseDateRangeData}
          />
        )}
        {/* Analysing metric single selector */}
        <SingleSelector
          title={
            <Text className="pr-4 text-black">{"Select metric columns"}</Text>
          }
          labels={header}
          values={header}
          selectedValue={
            Object.keys(selectedColumns).filter(
              (c) => selectedColumns[c]["type"] === "metric"
            ).length > 0
              ? Object.keys(selectedColumns).filter(
                  (c) => selectedColumns[c]["type"] === "metric"
                )[0]
              : ""
          }
          onValueChange={(metric) => onSelectMetrics([metric], "metric")}
        />
        {Object.keys(selectedColumns)
          .filter((c) => selectedColumns[c]["type"] === "metric")
          .map((m) => (
            <div key={m}>
              <SingleSelector
                title={<Subtitle className="pr-4">{m}</Subtitle>}
                labels={["Sum", "Count", "Distinct Count"]}
                values={["sum", "count", "distinct"]}
                selectedValue={selectedColumns[m]["aggregationOption"]!}
                onValueChange={(v) => onSelectMetricAggregationOption(m, v)}
                key={`${m}-selector`}
                instruction={<Text>How to aggregation the metric.</Text>}
              />
              <ExpectedChangeInput
                key={`${m}-change-input`}
                onValueChange={(v) =>
                  onSelectMetricDefaultValue(m, parseFloat(v) / 100)
                }
              />
            </div>
          ))}
        {/* Supporting metrics multi selector */}
        <MultiSelector
          title={"Select supporting metric columns (optional)"}
          labels={header.filter(
            (h) =>
              !(
                selectedColumns.hasOwnProperty(h) &&
                selectedColumns[h]["type"] === "metric"
              )
          )}
          values={header.filter(
            (h) =>
              !(
                selectedColumns.hasOwnProperty(h) &&
                selectedColumns[h]["type"] === "metric"
              )
          )}
          selectedValues={Object.keys(selectedColumns).filter(
            (c) => selectedColumns[c]["type"] === "supporting_metric"
          )}
          onValueChange={(metrics) =>
            onSelectMetrics(metrics, "supporting_metric")
          }
          instruction={
            <Text>
              Optional list of additional metrics to analyze together. For
              instance you may want to analyze the number of buyers and orders
              when analyzing the total sales revenue.
            </Text>
          }
        />
        {Object.keys(selectedColumns)
          .filter((c) => selectedColumns[c]["type"] === "supporting_metric")
          .map((m) => (
            <SingleSelector
              title={<Subtitle className="pr-4">{m}</Subtitle>}
              labels={["Sum", "Count", "Distinct Count"]}
              values={["sum", "count", "distinct"]}
              selectedValue={selectedColumns[m]["aggregationOption"]!}
              onValueChange={(v) => onSelectMetricAggregationOption(m, v)}
              key={m}
              instruction={<Text>How to aggregation the metric.</Text>}
            />
          ))}
        {/* Dimension columns multi selector */}
        <MultiSelector
          title={"Select dimension columns"}
          labels={header.filter(
            (h) =>
              !(
                selectedColumns.hasOwnProperty(h) &&
                (selectedColumns[h]["type"] === "metric" ||
                  selectedColumns[h]["type"] === "supporting_metric")
              )
          )}
          values={header.filter(
            (h) =>
              !(
                selectedColumns.hasOwnProperty(h) &&
                (selectedColumns[h]["type"] === "metric" ||
                  selectedColumns[h]["type"] === "supporting_metric")
              )
          )}
          selectedValues={Object.keys(selectedColumns).filter(
            (c) => selectedColumns[c]["type"] === "dimension"
          )}
          onValueChange={onSelectDimension}
          instruction={
            <Text>
              A list of column to aggregate the metrics based on. For instance
              user demographics (gender, age group, ...), product attributes
              (brand, category, ...).
            </Text>
          }
        />
      </div>
      <Flex justifyContent="center" className="flex-col">
        <Divider />
        <Button
          onClick={(e) => {
            handleOnSubmit(e);
          }}
          loading={isUploading}
          disabled={!canSubmit()}
        >
          {isUploading ? "Uploading" : "Submit"}
        </Button>
      </Flex>
    </Card>
  );
}

export default DataConfig;
