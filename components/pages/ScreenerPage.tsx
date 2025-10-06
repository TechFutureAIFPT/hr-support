
import React from 'react';
import type { AppStep, Candidate, HardFilters, WeightCriteria } from '../../types';
import JDInput from '../modules/JDInput';
import WeightsConfig from '../modules/WeightsConfig';
import CVUpload from '../modules/CVUpload';
import AnalysisResults from '../modules/AnalysisResults';


interface ScreenerPageProps {
  jdText: string;
  setJdText: React.Dispatch<React.SetStateAction<string>>;
  jobPosition: string;
  setJobPosition: React.Dispatch<React.SetStateAction<string>>;
  weights: WeightCriteria;
  setWeights: React.Dispatch<React.SetStateAction<WeightCriteria>>;
  hardFilters: HardFilters;
  setHardFilters: React.Dispatch<React.SetStateAction<HardFilters>>;
  cvFiles: File[];
  setCvFiles: React.Dispatch<React.SetStateAction<File[]>>;
  analysisResults: Candidate[];
  setAnalysisResults: React.Dispatch<React.SetStateAction<Candidate[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loadingMessage: string;
  setLoadingMessage: React.Dispatch<React.SetStateAction<string>>;
  activeStep: AppStep;
  setActiveStep: (step: AppStep) => void;
  completedSteps: AppStep[];
  markStepAsCompleted: (step: AppStep) => void;
}

const ScreenerPage: React.FC<ScreenerPageProps> = (props) => {
  const { activeStep } = props;

  return (
    <>
      <div className={activeStep === 'jd' ? 'block' : 'hidden'}>
        <JDInput
          jdText={props.jdText}
          setJdText={props.setJdText}
          jobPosition={props.jobPosition}
          setJobPosition={props.setJobPosition}
          onComplete={() => {
            props.markStepAsCompleted('jd');
            props.setActiveStep('weights');
          }}
        />
      </div>
      <div className={activeStep === 'weights' ? 'block' : 'hidden'}>
        <WeightsConfig
          weights={props.weights}
          setWeights={props.setWeights}
          hardFilters={props.hardFilters}
          setHardFilters={props.setHardFilters}
          onComplete={() => {
            props.markStepAsCompleted('weights');
            props.setActiveStep('upload');
          }}
        />
      </div>
      <div className={activeStep === 'upload' ? 'block' : 'hidden'}>
        <CVUpload
          cvFiles={props.cvFiles}
          setCvFiles={props.setCvFiles}
          jdText={props.jdText}
          weights={props.weights}
          hardFilters={props.hardFilters}
          setAnalysisResults={props.setAnalysisResults}
          setIsLoading={props.setIsLoading}
          setLoadingMessage={props.setLoadingMessage}
          onAnalysisStart={() => {
            props.markStepAsCompleted('upload');
            props.setActiveStep('analysis');
          }}
          completedSteps={props.completedSteps}
        />
      </div>
      <div className={activeStep === 'analysis' ? 'block' : 'hidden'}>
        <AnalysisResults
          isLoading={props.isLoading}
          loadingMessage={props.loadingMessage}
          results={props.analysisResults}
          jobPosition={props.jobPosition}
          locationRequirement={props.hardFilters.location}
          jdText={props.jdText}
        />
      </div>
    </>
  );
};

export default ScreenerPage;