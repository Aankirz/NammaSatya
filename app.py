import streamlit as st
from agent import check_claim

VERDICT_COLOURS = {
    "SUPPORTED":  "#2f9e44",
    "REFUTED":    "#c92a2a",
    "UNVERIFIED": "#868e96",
    "MANGLED":    "#e67700",
}

st.set_page_config(page_title="NammaSatya", page_icon="")
st.title("NammaSatya — Bengaluru Truth Check")
st.caption("Paste any viral Bengaluru civic claim. Get a verdict backed by verified sources.")

claim = st.text_area(
    "Claim to verify",
    height=100,
    placeholder='"BMRCL is shutting the Purple Line on Tuesday"',
)

if st.button("Check this claim", disabled=not claim.strip()):
    with st.spinner("Searching verified sources..."):
        result = check_claim(claim)

    verdict = result["verdict"]
    colour  = VERDICT_COLOURS[verdict]

    st.markdown(f"### <span style='color:{colour}'>{verdict}</span>", unsafe_allow_html=True)
    st.progress(result["confidence"])
    st.caption(f"Confidence: {result['confidence']:.0%}  ·  Query used: _{result.get('query', '')}_")
    st.write(result["summary"])

    if result["citations"]:
        st.markdown("#### Sources")
        for c in result["citations"]:
            st.markdown(
                f"**{c['source']}** · {c.get('date', '')}  \n"
                f"> {c.get('excerpt', '')}  \n"
                f"[Read original]({c['url']})"
            )
    else:
        st.info("No sources found in the index. The claim may be too recent or outside our source coverage.")
