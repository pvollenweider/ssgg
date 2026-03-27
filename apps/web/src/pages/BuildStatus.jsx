// Copyright (c) 2026 Philippe Vollenweider
//
// This file is part of the GalleryPack commercial platform.
// This source code is proprietary and confidential.
// Use, reproduction, or distribution requires a valid commercial license.
// Unauthorized use is strictly prohibited.

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api }       from '../lib/api.js';
import { BuildLog }  from '../components/BuildLog.jsx';

export default function BuildStatus() {
  const { jobId }   = useParams();
  const navigate    = useNavigate();
  const [job,     setJob]     = useState(null);
  const [gallery, setGallery] = useState(null);
  const [done,    setDone]    = useState(false);

  useEffect(() => {
    api.getJob(jobId).then(setJob).catch(() => navigate('/'));
  }, [jobId]);

  function handleDone(finalStatus) {
    setDone(true);
    api.getJob(jobId).then(j => {
      setJob(j);
      if (finalStatus === 'done') api.getGallery(j.galleryId).then(setGallery).catch(() => {});
    });
  }

  return (
    <>
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2 align-items-center">
            <div className="col-sm-6">
              <h1 className="m-0">Build {jobId.slice(-8)}</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="row justify-content-center">
            <div className="col-lg-10">

              {/* Build meta */}
              {job && (
                <div className="card">
                  <div className="card-body py-2">
                    <div className="d-flex flex-wrap" style={{ gap: '1.5rem', fontSize: '0.85rem', color: '#666' }}>
                      <span><strong>Gallery:</strong> {job.galleryId}</span>
                      <span><strong>Triggered:</strong> {new Date(job.createdAt).toLocaleString()}</span>
                      {job.durationMs && <span><strong>Duration:</strong> {(job.durationMs / 1000).toFixed(1)}s</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Build log */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title"><i className="fas fa-terminal me-2" />Build Log</h3>
                </div>
                <div className="card-body p-0">
                  <BuildLog jobId={jobId} onDone={handleDone} />
                </div>
              </div>

              {/* Post-build actions */}
              {done && job && (
                <div className="d-flex" style={{ gap: '0.75rem' }}>
                  <Link to={`/galleries/${job.galleryId}`} className="btn btn-dark">
                    <i className="fas fa-arrow-left me-1" />Back to gallery
                  </Link>
                  {gallery && (() => {
                    const publicPath = (gallery.breadcrumb?.project?.slug && gallery.access !== 'password' && gallery.access !== 'private')
                      ? `/${gallery.breadcrumb.project.slug}/${gallery.slug}`
                      : `/${gallery.slug}`;
                    return (
                      <a href={`${publicPath}/`} target="_blank" rel="noreferrer" className="btn btn-success">
                        View gallery <i className="fas fa-external-link-alt ms-1" />
                      </a>
                    );
                  })()}
                </div>
              )}

            </div>
          </div>
        </div>
      </section>
    </>
  );
}
