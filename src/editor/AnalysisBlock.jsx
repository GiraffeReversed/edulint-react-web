import React from "react";
import Split from "react-split";
import { toast } from "react-toastify";
import DOMPurify from "dompurify";

import ProblemsBlock from "./ProblemsBlock";

import CtrlShortcut from "../utils/CtrlShortcut";

import { Navigate, useLoaderData, useLocation } from "react-router-dom";
import { Buttons, FeedbackInfo } from './AnalysisBlockElems';
import CodeMirrorWrapper from './CodeBlock';

function analyze(code, version, setProblems, setStatus) {
  // plausible('check-button');


  fetch(`https://edulint.rechtackova.cz/api/${version}/analyze`, {
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
  let { state } = useLocation();
  let [problems, setProblems] = React.useState([]);
  let [status, setStatus] = React.useState("init"); // init, linting, results or error
  let [explanations, setExplanations] = React.useState({});
  let [versions, setVersions] = React.useState([]);

  let [code, setCode] = React.useState(state?.code?.slice() || "");
  let [version, setVersion] = React.useState(null);

  React.useEffect(() => {
    if (state) {
      state.code = undefined;
    }

    fetch("https://edulint.rechtackova.cz/api/explanations")
      .then((response) => {
        if (response.status !== 200) {
          toast.error(<>Failed to fetch explanations. Please retry later.</>);
          return {};
        }
        return response.json();
      })
      .then((data) => {
        let res = Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, {
            why: DOMPurify.sanitize(v.why),
            examples: DOMPurify.sanitize(v.examples),
          }])
        );
        setExplanations(res);
      });

    fetch("https://edulint.rechtackova.cz/api/versions")
      .then((response) => {
        if (response.status !== 200) {
          toast.error(<>Failed to fetch available versions. Please retry later.</>)
          return [];
        }
        return response.json();
      })
      .then((versions) => {
        versions = versions.map(({ version }) => version.join("."));
        setVersions(versions);
        setVersion(versions[0]);
      })
  }, []);

  return (
    <Split className="d-flex flex-row flex-fill" id="analysis-block"
      minSize={250} snapOffset={0} sizes={[60, 40]}
    >
      <div id="code-block" className="d-flex flex-column ms-3 me-2 mt-1 mb-2">
        <div className="d-flex flex-row justify-content-between">
          <h5>Code</h5>
          <small hidden={problems.length == 0}>
            <CtrlShortcut letter="D" /> to mark current line as solved
          </small>
        </div>

        <CodeMirrorWrapper value={code} onChange={(value, viewUpdate) => { setCode(value); }} />

        <Buttons status={status} setStatus={setStatus} code={code} setCode={setCode}
          versions={versions} version={version} onVersionChange={setVersion}
          onCheck={() => { analyze(code, version, setProblems, setStatus); setStatus("linting"); }} />

        <FeedbackInfo />
      </div>
      <ProblemsBlock status={status} problems={problems} explanations={explanations} />
    </Split>
  )
}


export function AnalysisBlockCodeRedirector() {
  let loaded = useLoaderData();
  return (<Navigate to="/editor" state={{ code: loaded }} />);
}