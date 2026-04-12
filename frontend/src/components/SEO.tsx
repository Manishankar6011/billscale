import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

interface SEOProps {
    title?: string;
    description?: string;
    path?: string;
}

const SEO: React.FC<SEOProps> = ({ title, description, path }) => {
    const { t, i18n } = useTranslation();

    const seoTitle = title || t('seo.title');
    const seoDescription = description || t('seo.description');
    const domain = "https://buildmateerp.in"; // Fallback domain
    const url = `${domain}${path || ''}`;

    // Schema.org JSON-LD
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "BuildMate ERP",
        "operatingSystem": "Web, Android, iOS",
        "applicationCategory": "BusinessApplication",
        "description": t('seo.description'),
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "INR"
        },
        "author": {
            "@type": "Organization",
            "name": "BuildMate ERP India",
            "url": domain
        }
    };

    return (
        <Helmet>
            {/* Standard Meta Tags */}
            <title>{seoTitle}</title>
            <meta name="description" content={seoDescription} />
            <link rel="canonical" href={url} />
            <html lang={i18n.language} />

            {/* Language Alternates */}
            <link rel="alternate" hrefLang="en" href={`${domain}?lng=en`} />
            <link rel="alternate" hrefLang="hi" href={`${domain}?lng=hi`} />
            <link rel="alternate" hrefLang="x-default" href={domain} />

            {/* Open Graph */}
            <meta property="og:title" content={seoTitle} />
            <meta property="og:description" content={seoDescription} />
            <meta property="og:url" content={url} />

            {/* Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify(jsonLd)}
            </script>
        </Helmet>
    );
};

export default SEO;
