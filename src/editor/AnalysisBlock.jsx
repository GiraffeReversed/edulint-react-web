import React from "react";
import Split from "react-split";
import { toast } from "react-toastify";
import DOMPurify from "dompurify";

import ProblemsBlock from "./ProblemsBlock";

import { Navigate, useLoaderData, useLocation, useNavigate } from "react-router-dom";
import { Buttons, FeedbackInfo, downloadFile, loadFile } from './AnalysisBlockElems';
import CodeMirrorWrapper, { useCodeMirrorCustom, onCodeSelect, gotoLine } from './CodeBlock';

function fetchData(url, toastContents, errorReturn, processResult) {
  fetch(url)
    .then(response => {
      if (response.status !== 200) {
        toast.error(toastContents);
        return errorReturn;
      }
      return response.json();
    }).then(processResult);
}

function fetchExplanations(setExplanations) {
  fetchData(
    "https://edulint.com/api/explanations",
    <>Failed to fetch explanations. Please retry later.</>,
    {},
    (data) => {
      let res = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, {
          why: DOMPurify.sanitize(v.why),
          examples: DOMPurify.sanitize(v.examples),
        }])
      );
      setExplanations(res);
    });
}

function fetchVersions(setVersions, setVersion) {
  fetchData(
    "https://edulint.com/api/versions",
    <>Failed to fetch available versions. Please retry later.</>,
    [],
    (versions) => {
      setVersions(versions);
      setVersion(versions[0]);
    }
  );
}

function analyze(code, version, setProblems, setActiveProblemsRange, setStatus) {
  // plausible('check-button');  TODO: https://github.com/GiraffeReversed/edulint-web/commit/725fba5212754a12523e70b4eb0dfb9547f6a65e

  setStatus("linting");
  setActiveProblemsRange({ min: undefined, max: undefined });
  setProblems([]);

  fetch(`https://edulint.com/api/${version}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: code
    })
  })
    .then(response => {
      if (response.status !== 200) {
        const error = new Error("not 200 status code");
        error.name = "errorNot200";
        error.status = response.status;
        throw error;
      }
      return response.json() // .json() for Objects vs text() for raw
    })
    .then(problems => {
      setProblems(problems);
      setStatus("results");
    })
    .catch(error => {
      if (error?.name === "errorNot200") {
        setStatus("error");
      } else {
        throw error;
      }
    });
}

export function AnalysisBlock() {
  let loc = useLocation();
  let navigate = useNavigate();

  let [problems, setProblems] = React.useState([]);
  let [status, setStatus] = React.useState("init"); // init, linting, results or error
  let [explanations, setExplanations] = React.useState({});
  let [versions, setVersions] = React.useState([]);

  let [code, setCode] = React.useState(loc.state?.code?.slice() || "");
  let [version, setVersion] = React.useState(null);

  let [activeProblemsRange, setActiveProblemsRange] = React.useState({ min: undefined, max: undefined });

  let { view, editor } = useCodeMirrorCustom({
    value: code,
    onChange: setCode,
    problems: problems,
    onProblemArrowClick: setActiveProblemsRange,
    onCodeSelect: update => onCodeSelect(update, setActiveProblemsRange)
  });

  React.useEffect(() => {
    if (loc.state) {
      loc.state.code = undefined;
    }

    fetchExplanations(setExplanations);
    fetchVersions(setVersions, setVersion);
  }, []);

  return (
    <Split className="d-flex flex-row flex-fill" id="analysis-block"
      minSize={250} snapOffset={0} sizes={[60, 40]}
    >
      <div id="code-block" className="d-flex flex-column ms-3 me-2 mt-1 mb-2">
        <div className="d-flex flex-row justify-content-between">
          <h5>Code</h5>
        </div>

        <CodeMirrorWrapper view={view} editor={editor} problems={problems} />

        <Buttons status={status} versions={versions} version={version}
          onLoad={(e) => loadFile(e, setCode, setProblems, setStatus, setActiveProblemsRange, navigate)}
          onDownload={() => downloadFile(code)}
          onVersionChange={setVersion}
          onCheck={() => analyze(code, version, setProblems, setActiveProblemsRange, setStatus)} />

        <FeedbackInfo />
      </div>
      <ProblemsBlock status={status} problems={problems} explanations={explanations}
        activeProblemsRange={activeProblemsRange}
        onProblemGotoClick={i => gotoLine(view, i)}
      />
    </Split>
  )
}


export function AnalysisBlockCodeRedirector() {
  let loaded = useLoaderData();
  return (<Navigate to="/editor" state={{ code: loaded }} />);
}