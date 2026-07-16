use lisca::protocol::AnalysisProgress;
use lisca_server::KeyedRuns;

pub type AnalysisJobState = KeyedRuns<AnalysisProgress>;

pub trait HasAnalysisJobs: Clone + Send + Sync + 'static {
    fn analysis_jobs(&self) -> &AnalysisJobState;
}
